const producoes = {
        cafe: {
                tipo: "plantacao",
                semente: "semente_cafe",
		produto: "cafe",
		nome: "Café",
		id: "cafe",
		stem: "#8b7355",
		fruit: "#8b4513"
	},
	trigo: {
		tipo: "plantacao",
		semente: "semente_trigo",
		produto: "trigo",
		nome: "Trigo",
		id: "trigo",
		stem: "#c4a747",
		fruit: "#daa520"
	},
	algodao: {
		tipo: "plantacao",
		semente: "semente_algodao",
		produto: "algodao",
		nome: "Algodão",
		id: "algodao",
		stem: "#5a9d5d",
		fruit: "#f5f5f5"
	},
	cana_de_acucar: {
		tipo: "plantacao",
		semente: "semente_cana",
		produto: "acucar",
		nome: "Cana de Açúcar",
		id: "cana_de_acucar",
		stem: "#4a7c4e",
		fruit: "#ffd700"
	},
	feijao: {
		tipo: "plantacao",
		semente: "semente_feijao",
		produto: "feijao",
		nome: "Feijão",
		id: "feijao",
		stem: "#5a7d5a",
		fruit: "#8b4513"
	},
	milho: {
		tipo: "plantacao",
		semente: "semente_milho",
		produto: "milho",
		nome: "Milho",
		id: "milho",
		stem: "#5a9d5d",
		fruit: "#ffd700"
	},
	arroz: {
		tipo: "plantacao",
		semente: "semente_arroz",
		produto: "arroz",
		nome: "Arroz",
		id: "arroz",
		stem: "#a4a45a",
		fruit: "#f0e68c"
	},
	soja: {
		tipo: "plantacao",
		semente: "semente_soja",
		produto: "soja",
		nome: "Soja",
		id: "soja",
		stem: "#6b8e23",
		fruit: "#90ee90"
	},
	mandioca: {
		tipo: "plantacao",
		semente: "semente_mandioca",
		produto: "mandioca",
		nome: "Mandioca",
		id: "mandioca",
		stem: "#8b5a3c",
		fruit: "#cd853f"
	}
};

function getCrop(tipo) {
	return producoes[tipo];
}

module.exports = { getCrop };