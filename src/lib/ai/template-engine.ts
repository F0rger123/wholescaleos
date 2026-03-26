export function formatTemplate(template: string, data: Record<string, any>): string {
  let formatted = template;
  
  // Replace placeholders like {count}, {list}, {name}, {description}, {number}
  for (const key in data) {
    const value = data[key];
    const placeholder = `{${key}}`;
    
    if (formatted.includes(placeholder)) {
      // Format lists nicely if the value is a string with commas
      let displayValue = value;
      if (key === 'list' && typeof value === 'string' && value.includes(',')) {
        const items = value.split(',').map(i => i.trim());
        if (items.length > 1) {
          const lastItem = items.pop();
          displayValue = items.join(', ') + ' and ' + lastItem;
        }
      }
      
      formatted = formatted.replace(new RegExp(placeholder, 'g'), String(displayValue));
    }
  }
  
  return formatted;
}
