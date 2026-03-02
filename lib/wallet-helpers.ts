// Shared helper — importato sia da lib/google-wallet.ts che da app/api/wallet-image/route.tsx
// Compatibile con Edge Runtime (nessuna dipendenza Node.js)

export function getNextRewardText(
  currentStamps: number,
  stampsRequired: number,
  rewardDescription: string,
  rewards: Array<{ name: string; stamps_required: number }>
): { header: string; body: string } {
  const sorted = [...rewards].sort((a, b) => a.stamps_required - b.stamps_required)

  // Primo premio con soglia STRETTAMENTE maggiore degli stamp attuali
  const next = sorted.find(r => r.stamps_required > currentStamps)

  if (!next) {
    // Nessun premio intermedio rimanente — controlla il premio finale
    if (currentStamps >= stampsRequired) {
      return { header: 'PREMIO PRONTO', body: rewardDescription }
    } else {
      return { header: 'PROSSIMO PREMIO', body: `${rewardDescription} a ${stampsRequired}` }
    }
  }

  return { header: 'PROSSIMO PREMIO', body: `${next.name} a ${next.stamps_required}` }
}
