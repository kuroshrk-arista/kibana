export function getScopingByAttribute(attribute, value) {
    let v = value;
    if (typeof value === 'string') {
      v = `"${value}"`;
    }
    return `[${attribute}=${v}]`;
  }
  