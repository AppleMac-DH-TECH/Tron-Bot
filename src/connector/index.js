// import TronWeb from 'tronweb'
// const HttpProvider = TronWeb.providers.HttpProvider;
// const fullNode = new HttpProvider("https://api.trongrid.io");
// const solidityNode = new HttpProvider("https://api.trongrid.io");
// const eventServer = new HttpProvider("https://api.trongrid.io");
// const privateKey = "e2a4062e76828cc7baf6ca3ed192c135be0c7ee7916e0f1da327fbc99be66ebc";
// const tronWeb = new TronWeb(fullNode,solidityNode,eventServer,privateKey);
// tronWeb.setHeader({"TRON-PRO-API-KEY": '2cef2543-fb97-4308-8ab8-78623534f4b4'});

import TronWeb from 'tronweb'
const fullNode = 'https://api.shasta.trongrid.io';
const solidityNode = 'https://api.shasta.trongrid.io';
const eventServer = 'https://api.shasta.trongrid.io';
const privateKey = process.env.REACT_APP_Private_Key;

const tronWeb = new TronWeb(fullNode,solidityNode,eventServer,privateKey);

export default tronWeb;