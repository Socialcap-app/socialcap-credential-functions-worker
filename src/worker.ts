import { UInt64, PublicKey, Mina, fetchAccount, Field } from "o1js";
import { zkCloudWorker, Cloud, initBlockchain } from "zkcloudworker";
import { CredentialContract } from "./contract";

const MINA = 1e9;
const TXN_FEE = 100_000_000;

interface Payload {
  memo: string,
  sender: string;
  credential_id: string;
};

let VerificationKey: any | null = null;


function getPayload(transactions: string[]): Payload {
  if (!transactions || !transactions.length) 
    throw Error("No payload received.")      
  try { 
    let payload = JSON.parse(transactions[0]); 
    return payload;
  }
  catch(error) { 
    throw Error ("Could not parse received transaction.") 
  }
}

async function isCompiled(vk: any | null): Promise<any | null> {
  if (!vk) {
    // TODO: use cache !
    try {
      let t0 = Date.now()
      const compiled = await CredentialContract.compile();
      vk = compiled.verificationKey;
      let dt = (Date.now() - t0)/1000;
      console.log(`Compiled time=${dt}secs`);
      return vk;
    }
    catch (err) {
      throw Error("Unable to compile Socialcap Credential contract");
    }
  }
  return vk;
}


export class CredentialWorker extends zkCloudWorker {
  
  constructor(cloud: Cloud) {
    super(cloud);
  }

  public async execute(transactions: string[]): Promise<string | undefined> {
    console.log(`Task: ${this.cloud.task}`)
    console.log(`Args: ${this.cloud.args}`)
    console.log(`Payload: ${transactions[0]}`);

    // let { chainId } = JSON.parse(this.cloud.args || '{"chainId": "devnet"}');
    // await initBlockchain(chainId);
    // console.log(`Using chain: ${chainId}`);
    
    let { memo, sender, credential_id } = getPayload(transactions);
    console.log(`Checking credential: ${credential_id} owned by: ${sender} `);

    let payerPublicKey = PublicKey.fromBase58(sender);
    let payerExists = await fetchAccount({ publicKey: payerPublicKey });
    if (!payerExists) throw Error("Sender account does not exist");
    console.log(`Sender account exists`);
    
    let pubkey = PublicKey.fromBase58(credential_id); 
    let account = await fetchAccount({ publicKey:  pubkey });
    if (!account) throw Error("CredentialContract account does not exist");
    console.log(`CredentialContract account exists`);
    
    VerificationKey = await isCompiled(VerificationKey);

    let zkApp = new CredentialContract(pubkey);
  
    const txn = await Mina.transaction({ 
        sender: payerPublicKey, 
        fee: TXN_FEE, 
        memo: (memo || "").substring(0,32) 
      }, 
      async () => {
        await zkApp.isOwner(
            Field(credential_id)
          );
      }
    );
    console.log(`Transaction created`, txn.toPretty());

    let unsignedTxn = await txn.prove();
    console.log(`Unsigned transaction created and proved`);

    // return the serialized unsigned transaction
    return unsignedTxn.toJSON();
  }
}