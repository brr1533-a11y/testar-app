/* Pontos de integração deliberadamente desligados até a escolha/homologação dos provedores. */
class IntegrationUnavailable extends Error { constructor(name){super(name+' ainda não configurado. Os registros locais continuam disponíveis.');this.statusCode=503;this.code='INTEGRATION_NOT_CONFIGURED';} }
const adapters={fiscal:null,weather:null,whatsapp:null};
function register(name,adapter){if(!Object.hasOwn(adapters,name))throw Error('Integração desconhecida.');adapters[name]=adapter;}
function ready(name){return Boolean(adapters[name]);}
function get(name){if(!ready(name))throw new IntegrationUnavailable(name==='fiscal'?'Emissor/consulta da SEFAZ':name==='weather'?'Provedor de clima':'WhatsApp Business');return adapters[name];}
module.exports={IntegrationUnavailable,register,ready,get};
