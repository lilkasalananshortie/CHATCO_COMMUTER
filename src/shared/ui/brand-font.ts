export function brandFont(weight?: string | number): string {
  const value = weight === "bold" ? 700 : Number(weight ?? 400);
  return value >= 700 ? "Poppins-Bold" : value >= 600 ? "Poppins-SemiBold" : value >= 500 ? "Poppins-Medium" : "Poppins-Regular";
}
