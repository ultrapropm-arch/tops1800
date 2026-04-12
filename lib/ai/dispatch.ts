export type Installer = {
  id: string;
  name: string;
  distanceKm?: number;
  rating?: number;
  activeJobs?: number;
};

export type ScoredInstaller = Installer & {
  score: number;
  scoreBreakdown: {
    distanceScore: number;
    ratingScore: number;
    workloadScore: number;
  };
};

export function recommendInstaller(
  installers: Installer[]
): {
  recommended: ScoredInstaller | null;
  all: ScoredInstaller[];
} {
  if (!installers.length) {
    return {
      recommended: null,
      all: [],
    };
  }

  const scored: ScoredInstaller[] = installers.map((installer) => {
    const distanceScore = Math.max(0, 100 - Number(installer.distanceKm || 0));
    const ratingScore = Number(installer.rating || 0) * 20;
    const workloadScore = Math.max(
      0,
      30 - Number(installer.activeJobs || 0) * 10
    );

    const score = distanceScore + ratingScore + workloadScore;

    return {
      ...installer,
      score,
      scoreBreakdown: {
        distanceScore,
        ratingScore,
        workloadScore,
      },
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    recommended: scored[0],
    all: scored,
  };
}