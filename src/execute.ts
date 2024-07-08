import "dotenv/config";
import { zkCloudWorkerClient } from "zkcloudworker";
import fs from "fs";

async function main(args: string[]) {
  console.log(`zkCloudWorker Socialcap credential related worker(c) LEOMANZA 2024 www.zkcloudworker.com`);
  if (!args[0] || !args[1]) {
    console.log(`Use: \n  yarn start {sender} {credential_id}`);
    process.exit(1);
  }
  console.log(`Sender: ${args[0]} Credential ID: ${args[1]} }`);

  const JWT = process.env.JWT as string;
    console.log("JWT", JWT);
  const api = new zkCloudWorkerClient({
    jwt: JWT,
    chain: 'devnet'
  });

  const credential = {
    uid: '012345678'
  }

  const response = await api.execute({
    mode: "async",
    repo: "socialcap-credential-functions",
    developer: "LEOMANZA", // keep it simple, no strange chars here ! 
    task: "check-credential-owner",
    metadata: `Check owner for Credential ${credential.uid}`,
    args: JSON.stringify({ 
      chainId: 'devnet' 
    }),
    transactions: [JSON.stringify({
      memo: `Check owner for Credential ${credential.uid}`.substring(0, 32), // memo field in Txn
      sener: args[0],
      credential_id: args[1]
    })],
  });

  console.log("API response:", response);
  const jobId = response?.jobId;
  if (jobId === undefined) {
    throw new Error("Job ID is undefined");
  }

  console.log("Waiting for job ...");
  const jobResult = await api.waitForJobResult({ jobId });
  //console.log("Job result:", JSON.stringify(jobResult));
  //console.log("Job result.result:", JSON.stringify(jobResult.result));

  let { result } = jobResult.result;
  let fname = "./tmp/serialized-txn.json";
  console.log("Writing txn to: ", fname);
  console.log("Serialized Txn:", JSON.stringify(result, null, 2));

  fs.writeFileSync(fname, JSON.stringify(JSON.parse(result), null, 2));
}

main(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });