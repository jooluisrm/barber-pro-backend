// src/server.ts - VERSÃO CORRIGIDA
import { prisma } from "./libs/prisma";
import express from 'express';
import 'dotenv/config'; // Garante que as variáveis de ambiente sejam carregadas primeiro
import cors from 'cors';
import helmet from 'helmet';
import { mainRouter } from './routes'; // Suas outras rotas
import { PrismaClient, Role } from "@prisma/client";
import { AuthRequest, checkRole } from "./middlewares/authMiddlewareBarber";
import path from "path";

const server = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe SDK

// --- 1. CONFIGURAÇÕES GERAIS E DE SEGURANÇA ---
server.use(helmet());
server.use(cors());
server.disable('x-powered-by');

// --- 2. ROTA DE WEBHOOK (CASO ESPECIAL) ---
// Esta rota é definida ANTES do parser de JSON e usa seu próprio parser "raw".
server.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    console.log("Webhook recebido!");

    const sig = request.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
    } catch (err: any) {
        console.log(`❌ Erro na verificação do webhook: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Assinatura verificada. Evento: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as any;

            if (session.payment_status === 'paid') {
                console.log("✅ Checkout Session PAGA! Buscando dados da fatura para garantir a data...");

                const subscriptionId = session.subscription;
                const customerId = session.customer;
                const invoiceId = session.invoice; // <-- Pegando o ID da fatura da sessão

                try {
                    // Passo 1: Buscar os detalhes da fatura para pegar a data do período.
                    const invoice = await stripe.invoices.retrieve(invoiceId);

                    // Passo 2: Buscar os detalhes da assinatura para pegar os outros IDs.
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    // Verificação de segurança: garantir que a data da fatura é um número válido
                    if (typeof invoice.period_end !== 'number') {
                        throw new Error("A data final do período na fatura não é um número válido.");
                    }

                    // --- LÓGICA TEMPORÁRIA PARA AMBIENTE DE TESTE --- removela qnd mudar para produção

                    // 1. Pega a data de expiração original que o Stripe enviou (que vence em minutos).
                    const originalExpiration = new Date(invoice.period_end * 1000);

                    // 2. Cria uma nova data e adiciona 1 mês a ela.
                    const testExpiration = new Date(originalExpiration);
                    testExpiration.setMonth(testExpiration.getMonth() + 1);

                    // Logs para você ver a mágica acontecendo no seu terminal
                    console.log(`[MODO TESTE] Data original do Stripe: ${originalExpiration.toLocaleString('pt-BR')}`);
                    console.log(`[MODO TESTE] Nova data com +1 mês: ${testExpiration.toLocaleString('pt-BR')}`);
                    // fim do codigo teste 
                    await prisma.barbearia.update({
                        where: {
                            stripeCustomerId: customerId,
                        },
                        data: {
                            stripeSubscriptionId: subscription.id,
                            stripePriceId: subscription.items.data[0].price.id,
                            // ✅ Usa a nova data de expiração modificada para o teste
                            stripeCurrentPeriodEnd: testExpiration,
                            // ✅ Versão para produção:
                            //stripeCurrentPeriodEnd: new Date(invoice.period_end * 1000),
                        },
                    });

                    console.log(`✅🎉 SUCESSO ABSOLUTO! O CICLO ESTÁ COMPLETO! Banco de dados atualizado para o cliente: ${customerId}`);

                } catch (error: any) {
                    console.error(`❌ Erro na etapa final de atualização do BD: ${error.message}`);
                }
            } else {
                console.log(`Sessão completada, mas pagamento com status: ${session.payment_status}.`);
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            // Este evento é útil para renovações futuras, mas para o início, o checkout.session.completed é melhor.
            // Você pode adicionar a mesma lógica aqui no futuro para garantir que as renovações atualizem a data de expiração.
            console.log("Fatura de renovação paga. (Lógica de renovação pode ser adicionada aqui no futuro).");
            break;
        }

        default:
        // console.log(`Evento não tratado do tipo ${event.type}`);
    }


    response.send({ received: true });
});

// --- 3. MIDDLEWARE DE JSON PARA TODAS AS OUTRAS ROTAS ---
// Este middleware só se aplicará às rotas definidas ABAIXO dele.
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
// DENTRO DE src/server.ts

// DENTRO DE src/server.ts
// ✅ Rota para criar uma sessão do Portal do Cliente (Stripe)
// ALTERAÇÃO: Protegida para apenas ADMINS, pois é uma função administrativa.
server.post('/api/create-portal-session', checkRole([Role.ADMIN]), async (req: AuthRequest, res) => {
    try {
        // ALTERAÇÃO: Pegamos o barbeariaId diretamente do token do admin logado.
        const { barbeariaId } = req.user!;

        const barbearia = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
            select: { stripeCustomerId: true }
        });

        if (!barbearia || !barbearia.stripeCustomerId) {
            return res.status(400).json({ error: 'Cliente Stripe não encontrado para esta barbearia.' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: barbearia.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/assinaturas`, // Uma URL de retorno mais apropriada
        });

        res.json({ url: portalSession.url });

    } catch (error: any) {
        console.error("Erro ao criar sessão do portal:", error);
        res.status(500).json({ error: "Não foi possível iniciar o portal de gerenciamento." });
    }
});

// DENTRO DE src/server.ts, junto com suas outras rotas

// ALTERAÇÃO: Agora busca o usuário no modelo correto (UsuarioSistema).
server.get('/api/auth/me', checkRole([Role.ADMIN, Role.BARBEIRO]), async (req: AuthRequest, res) => {
    try {
        // ALTERAÇÃO: Pegamos o ID do usuário (não da barbearia) do token.
        const usuarioId = req.user?.id;

        const usuario = await prisma.usuarioSistema.findUnique({
            where: { id: usuarioId },
            // Opcional: incluir dados da barbearia na resposta
            include: {
                barbearia: {
                    select: {
                        nome: true,
                        status: true,
                        stripeCurrentPeriodEnd: true
                    }
                }
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        
        // Remove a senha antes de enviar a resposta
        const { senha, ...dadosUsuario } = usuario;
        return res.json(dadosUsuario);

    } catch (error) {
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

server.get('/api/auth/status', async (req, res) => {
    const barbeariaId = req.query.id as string;
    if (!barbeariaId) {
        return res.status(401).json({ error: 'ID da barbearia não fornecido' });
    }

    try {
        const barbearia = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
            select: { stripeCurrentPeriodEnd: true }
        });

        if (!barbearia || !barbearia.stripeCurrentPeriodEnd) {
            console.log(`[STATUS API] Barbearia ${barbeariaId} não encontrada ou sem data de expiração.`);
            return res.json({ isActive: false });
        }

        // --- DEPURAÇÃO AVANÇADA DE DATAS ---
        const expirationDate = new Date(barbearia.stripeCurrentPeriodEnd);
        const currentDate = new Date();

        // Convertendo para milissegundos (a forma mais segura de comparar)
        const expirationTime = expirationDate.getTime();
        const currentTime = currentDate.getTime();

        console.log("\n--- VERIFICANDO DATAS NA API DE STATUS ---");
        console.log("Data de Expiração (do Banco):", barbearia.stripeCurrentPeriodEnd);
        console.log("Data de Expiração (convertida):", expirationDate.toString());
        console.log("Data Atual (do servidor):", currentDate.toString());
        console.log("-----------------------------------------");
        console.log("Comparando (em milissegundos):");
        console.log(`Expiração (${expirationTime}) > Atual (${currentTime}) ?`);
        console.log("-----------------------------------------");
        // --- FIM DA DEPURAÇÃO ---

        // A lógica de comparação robusta
        const isActive = expirationTime > currentTime;

        console.log(`[STATUS API] Resultado para ${barbeariaId}: { isActive: ${isActive} }`);

        return res.json({ isActive });

    } catch (error) {
        console.error("Erro no endpoint /api/auth/status:", error);
        return res.status(500).json({ isActive: false, reason: 'Erro interno do servidor' });
    }
});

// ✅ Rota para iniciar o checkout da assinatura
// ALTERAÇÃO: Agora é segura e só pode ser iniciada por um ADMIN logado.
server.post('/create-checkout-session', checkRole([Role.ADMIN]), async (req: AuthRequest, res) => {
    try {
        // ALTERAÇÃO: Pegamos os dados do token, em vez do `req.body`. Mais seguro!
        const { barbeariaId, email: adminEmail } = req.user!;
        
        const barbearia = await prisma.barbearia.findUnique({
            where: { id: barbeariaId },
        });

        if (!barbearia) {
            // Este erro é improvável, pois o token garante que a barbearia existe.
            return res.status(404).json({ error: { message: "Barbearia associada ao seu usuário não encontrada." } });
        }

        let customerId = barbearia.stripeCustomerId;

        // Se a barbearia não tem um ID do Stripe, cria um novo
        if (!customerId) {
            const stripeCustomer = await stripe.customers.create({
                // ALTERAÇÃO: Usa o email do admin logado, que vem do token.
                email: adminEmail, 
                metadata: { barbeariaId: barbearia.id },
            });
            customerId = stripeCustomer.id;

            await prisma.barbearia.update({
                where: { id: barbeariaId },
                data: { stripeCustomerId: customerId },
            });
        }

        const priceId = 'price_1RbgVkIkmsl8H3nCKbi8vW5a'; // Seu Price ID
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancelado`,
        });

        res.json({ id: session.id });

    } catch (e: any) {
        console.error("Erro ao criar sessão de checkout:", e);
        res.status(500).json({ error: { message: e.message } });
    }
});

server.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// Suas outras rotas do mainRouter
server.use(mainRouter);


// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
const port = process.env.PORT || 3006;
server.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

export default server;