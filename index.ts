import { initializeBindings } from "o1js";
import { Cloud, zkCloudWorker, initBlockchain } from "zkcloudworker";
import { CredentialWorker } from "./src/worker";

// Keep this for compatibility
export async function zkcloudworker(cloud: Cloud): Promise<zkCloudWorker> {
  initializeBindings();
  console.log("zkcloudworker cloud chain:", cloud.chain);
  await initBlockchain(cloud.chain);
  return new CredentialWorker(cloud);
}