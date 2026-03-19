import { Queue } from "bullmq";
import { redis } from "./redis";

export const taskQueue = new Queue("zhima-tasks", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
