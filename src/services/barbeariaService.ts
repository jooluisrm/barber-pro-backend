import { prisma } from "../libs/prisma";


export const BuscarBarbeariasProximas = async (latUser: number, lonUser: number, raioKm: number) => {
    // Buscar todas as barbearias sem expor dados sensíveis
    const barbearias = await prisma.barbearia.findMany({
        select: {
            id: true,
            nome: true,
            endereco: true,
            celular: true,
            telefone: true,
            fotoPerfil: true,
            descricao: true,
            latitude: true,
            longitude: true,
            status: true
        }
    });

    // Calcular distância e filtrar barbearias dentro do raio desejado
    const barbeariasProximas = barbearias
        .map(barbearia => ({
            ...barbearia,
            distancia: calcularDistancia(latUser, lonUser, barbearia.latitude, barbearia.longitude)
        }))
        .filter(barbearia => barbearia.distancia <= raioKm)
        .sort((a, b) => a.distancia - b.distancia);

    return barbeariasProximas;
};

// Função para calcular a distância entre duas coordenadas usando a fórmula de Haversine
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Raio médio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
