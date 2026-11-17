/// <reference types="jest" />
import { extractReceiptToken } from "../receipt-token";

test("manual entry accepts the grouped code printed by the conductor", () => {
  expect(extractReceiptToken("CLAIM CODE: Ab12Cd Ef34Gh Ij56Kl Mn78Op Qr90St Uv"))
    .toBe("Ab12CdEf34GhIj56KlMn78OpQr90StUv");
});

test("QR and URL payloads keep their exact opaque token", () => {
  expect(extractReceiptToken('{"qr_token":"Ab12CdEf"}')).toBe("Ab12CdEf");
  expect(extractReceiptToken("https://example.test/receipt?qr_token=Ab12CdEf"))
    .toBe("Ab12CdEf");
});
