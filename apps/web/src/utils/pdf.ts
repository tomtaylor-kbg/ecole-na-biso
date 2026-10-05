const apiUrl = import.meta.env.VITE_API_URL ?? '';

export async function openPdf(endpoint: string, filename: string) {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('school-fees-token') ?? ''}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Impossible de générer le PDF.');
  }
  const url = URL.createObjectURL(await response.blob());
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
