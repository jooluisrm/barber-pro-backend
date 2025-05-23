import { Request, Response, Router } from 'express';
import usuarioRoutes from './usuarioRoutes';
import barbeariaRoutes from './barbeariaRoutes';
import barbeiroRoutes from './barbeiroRoutes';
import agendamentoRoutes from './agendamentoRoutes';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';

export const mainRouter = Router();

mainRouter.use('/usuario', usuarioRoutes);
mainRouter.use('/barbearia', barbeariaRoutes);
mainRouter.use('/barbeiro', barbeiroRoutes);
mainRouter.use('/agendamentos', agendamentoRoutes);


mainRouter.post('/pagamento/barbearia', async (req: Request, res: Response) => {
    const { nome, email, telefone, taxId, plano, valorCentavos } = req.body;

    // ✅ Validação básica
    if (!nome || !email || !telefone || !taxId || !plano || !valorCentavos) {
        return res.status(400).json({
            error: 'Todos os campos obrigatórios devem ser preenchidos: nome, email, telefone, taxId, plano, valorCentavos.'
        });
    }

    const barbeariaData = {
        nome: "Barbearia do João",
        email: "joao@barbearia.com",
        senha: "123456",
        endereco: "Rua Exemplo, 123",
        celular: "+5511999999999",
        telefone: "+551133333333",
        latitude: "-23.550520",
        longitude: "-46.633308",
        fotoPerfil: "https://imgurl.com/barbearia.png",
        descricao: "Barbearia top"
    };

    console.log({ nome, email, telefone, taxId });

    try {
        // ✅ Verifica se já existe cliente AbacatePay ou cria
        const customerId = await createCustomer(nome, email, telefone, taxId);

        // ✅ Cria cobrança
        const billing = await createBilling(customerId, plano, valorCentavos, barbeariaData);

        // ✅ Salva cobrança no banco
        const pagamento = await prisma.pagamentoBarbearia.create({
            data: {
                email,
                nome,
                plano,
                valorCentavos,
                customerId,
                billingId: billing.billing_id, // ajuste conforme retorno da API
            }
        });

        return res.status(201).json({
            message: 'Cobrança criada com sucesso.',
            pagamento,
            billing
        });
    } catch (error: any) {
        console.error('Erro ao criar cobrança:', error);
        return res.status(500).json({ error: error.message || 'Erro interno ao criar cobrança.' });
    }
});


import axios from 'axios';
import { prisma } from '../libs/prisma';

const ABACATEPAY_TOKEN = process.env.ABACATEPAY_TOKEN!;
const ABACATEPAY_API = 'https://api.abacatepay.com/v1';

export const createCustomer = async (
    name: string,
    email: string,
    cellphone: string,
    taxId: string
) => {
    const response = await axios.post(`${ABACATEPAY_API}/customer/create`, {
        name,
        email,
        cellphone,
        taxId
    }, {
        headers: {
            Authorization: `Bearer ${ABACATEPAY_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    console.log("createCustomer response =>", response.data);

    // ✅ Correção: pega de response.data.data.id
    return response.data.data.id;
};




export const createBilling = async (customerId: string, nomePlano: string, valorCentavos: number, barbeariaData: any) => {
    console.log("customerId =>", customerId);
    const response = await axios.post(`${ABACATEPAY_API}/billing/create`, {
        frequency: "ONE_TIME",
        methods: ["PIX"],
        products: [
            {
                externalId: `plano-${nomePlano}`,
                name: `Plano ${nomePlano}`,
                description: `Assinatura do plano ${nomePlano}`,
                quantity: 1,
                price: valorCentavos
            }
        ],
        returnUrl: 'https://barberpro.com.br/retorno',
        completionUrl: 'https://barberpro.com.br/concluido',
        customerId,
        metadata: barbeariaData
    }, {
        headers: {
            Authorization: `Bearer ${ABACATEPAY_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data; // pode incluir link, QR code, etc.
};

mainRouter.post('/webhook/abacatepay', async (req, res) => {
    const event = req.body;

    console.log("Webhook recebido:", event);

    try {
        const { event: eventType, data } = event;

        if (eventType === 'payment.status.changed') {
            const { status, billing } = data;

            console.log("Status recebido:", status);

            if (status === 'COMPLETED') {
                const { metadata } = billing;

                // Aqui assumimos que na cobrança você enviou dados da barbearia como metadata.
                const { nome, email, senha, endereco, celular, telefone, latitude, longitude, fotoPerfil, descricao } = metadata;

                // Confere se a barbearia já existe
                const barbeariaExistente = await prisma.barbearia.findFirst({
                    where: { email }
                });

                if (!barbeariaExistente) {
                    const senhaHash = await bcrypt.hash(senha, 10);

                    await prisma.barbearia.create({
                        data: {
                            nome,
                            email,
                            senha: senhaHash,
                            endereco,
                            celular,
                            telefone: telefone || '',
                            latitude: parseFloat(latitude),
                            longitude: parseFloat(longitude),
                            fotoPerfil,
                            descricao
                        }
                    });

                    console.log(`✅ Barbearia criada: ${nome}`);
                } else {
                    console.log(`⚠️ Barbearia já existe: ${email}`);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Erro no webhook:", error);
        res.status(500).json({ error: "Erro interno no webhook." });
    }
});