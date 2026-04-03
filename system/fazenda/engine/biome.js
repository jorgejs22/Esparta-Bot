function getBiome(provincia) {
    const biomas = {
        Zeruz: {
            tipo: "estepe",
            producoes: ["cafe", "trigo"],
            skyTop: "#87ceeb",
            skyBottom: "#e0f6ff"
        },
        Virteskem: {
            tipo: "floresta",
            producoes: ["algodao", "cana_de_acucar"],
            skyTop: "#6ba3d4",
            skyBottom: "#b0d4e3"
        },
        Argos: {
            tipo: "riverland",
            producoes: ["feijao"],
            skyTop: "#87cefa",
            skyBottom: "#afd4ff"
        },
        Termópilas: {
            tipo: "urbano",
            producoes: ["milho"],
            skyTop: "#4a90e2",
            skyBottom: "#c5d9f1"
        },
        Ertrug: {
            tipo: "planalto",
            producoes: ["arroz", "soja", "mandioca"],
            skyTop: "#98d6e0",
            skyBottom: "#e0f4f7"
        }
    };

    return biomas[provincia];
}

const obterBioma = getBiome;

module.exports = { getBiome, obterBioma };