/// <reference types="jest" />
import React from "react";
import { VerificationCodeInput } from "../VerificationCodeInput";
let mockInputs = { current: [] as any[] };
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: () => mockInputs, useState: (initial: unknown) => [initial, jest.fn()] }));
jest.mock("react-native", () => ({ View: "View" }));
jest.mock("../BrandText", () => ({ TextInput: "Input" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors }) }));
let value = "";
function inputs(disabled = false) {
  const row = VerificationCodeInput({ value, onChange: code => { value = code; }, disabled });
  return React.Children.toArray(row.props.children) as React.ReactElement<Record<string, any>>[];
}
beforeEach(() => { value = ""; mockInputs = { current: [] }; });
test("six boxes support complete-code paste and advance focus", () => {
  const boxes = inputs(); const focus = jest.fn();
  mockInputs.current[5] = { focus };
  expect(boxes).toHaveLength(6);
  boxes[0]!.props.onChangeText("123456");
  expect(value).toBe("123456");
  expect(inputs().map(box => box.props.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
  expect(focus).toHaveBeenCalledTimes(1);
});
test("delete and backspace preserve the other digit positions", () => {
  value = "123456";
  inputs()[2]!.props.onChangeText("");
  expect(value).toBe("12 456");
  inputs()[2]!.props.onKeyPress({ nativeEvent: { key: "Backspace" } });
  expect(value).toBe("1  456");
  inputs()[1]!.props.onChangeText("98");
  expect(value).toBe("198456");
});
test("autofill works from any box, ignores letters and disables editing while saving", () => {
  inputs()[4]!.props.onChangeText("654321");
  expect(value).toBe("654321");
  inputs()[0]!.props.onChangeText("letters");
  expect(value).toBe("654321");
  expect(inputs(true).every(box => box.props.editable === false)).toBe(true);
  inputs(true)[0]!.props.onChangeText("0");
  expect(value).toBe("654321");
});
