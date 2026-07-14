export function toGenitive(name: string): string {
  if (!name) return name;

  if (/ья$/i.test(name)) {
    return name.slice(0, -2) + "ьи";
  }

  if (/ия$/i.test(name)) {
    return name.slice(0, -2) + "ии";
  }

  if (/я$/i.test(name)) {
    return name.slice(0, -1) + "и";
  }

  if (/а$/i.test(name)) {
    return name.slice(0, -1) + "ы";
  }

  if (/й$/i.test(name)) {
    return name.slice(0, -1) + "я";
  }

  if (/ь$/i.test(name)) {
    return name.slice(0, -1) + "я";
  }

  return name + "а";
}
