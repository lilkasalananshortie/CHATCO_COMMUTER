/// <reference types="jest" />
import { brandFont } from "../brand-font";
test.each([[undefined, "Poppins-Regular"], ["400", "Poppins-Regular"], ["500", "Poppins-Medium"], ["600", "Poppins-SemiBold"], ["bold", "Poppins-Bold"], ["900", "Poppins-Bold"]])("maps font weight %s to a bundled family", (weight, family) => {
  expect(brandFont(weight)).toBe(family);
});
