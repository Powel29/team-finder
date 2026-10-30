export const memberInclude = {
  user: { select: { id: true, name: true } },
  skills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
};

// Share of the profile that is filled in; weights add up to 100.
export function computeCompleteness(profile) {
  const parts = [
    [15, Boolean(profile.headline?.trim())],
    [15, Boolean(profile.bio?.trim())],
    [20, profile.skills.length > 0],
    [10, profile.interests.length > 0],
    [15, profile.lookingFor.length > 0],
    [15, Boolean(profile.githubUrl || profile.portfolioUrl)],
    [10, profile.availabilityHrs > 0],
  ];
  return parts.reduce((sum, [weight, ok]) => sum + (ok ? weight : 0), 0);
}

/** Public member DTO. Never includes email or any credential field. */
export function toMemberDto(profile, extra = {}) {
  return {
    userId: profile.user.id,
    name: profile.user.name,
    headline: profile.headline,
    bio: profile.bio,
    skills: profile.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })),
    experienceLevel: profile.experienceLevel,
    availabilityHrs: profile.availabilityHrs,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    interests: profile.interests,
    lookingFor: profile.lookingFor,
    isDiscoverable: profile.isDiscoverable,
    completeness: computeCompleteness(profile),
    ...extra,
  };
}
