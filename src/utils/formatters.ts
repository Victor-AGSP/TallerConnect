export function formatPlate(plate: string): string {
  if (!plate) return '';
  const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 2)}·${cleaned.slice(2, 4)}·${cleaned.slice(4, 6)}`;
  }
  return cleaned;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'Sin fecha';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
