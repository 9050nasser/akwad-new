import { createRequire } from "module";

const require = createRequire(import.meta.url);

let augmented = false;

/**
 * يوسّع `decodeRecordData40` في node-zklib لقراءة verify state (بايت 31) حسب مواصفات ZK
 * (zk-protocol data-record.md): 0 دخول، 1 خروج، 2 خروج استراحة، 3 دخول استراحة، 4 دخول إضافي، 5 خروج إضافي.
 */
export function augmentZklibAttendanceDecode() {
  if (augmented) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = require("node-zklib/utils") as any;
  const orig = utils.decodeRecordData40;
  utils.decodeRecordData40 = (recordData: Buffer) => {
    const base = orig(recordData) as {
      userSn: number;
      deviceUserId: string;
      recordTime: Date;
    };
    const verifyState = recordData.length >= 32 ? recordData.readUIntLE(31, 1) : 0;
    return { ...base, verifyState };
  };
  augmented = true;
}
