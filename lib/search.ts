import { Index } from "@upstash/search"

const searchIndex = new Index({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
})

export interface ProfileSearchData {
  id: string
  fullName: string
  company: string
  position: string
  industry: string
  city: string
  interests: string[]
  lookingFor: string[]
  bio: string
}

// Index a profile for search
export async function indexProfile(profile: ProfileSearchData) {
  const searchableText = [
    profile.fullName,
    profile.company,
    profile.position,
    profile.industry,
    profile.city,
    ...profile.interests,
    ...profile.lookingFor,
    profile.bio,
  ].join(" ")

  await searchIndex.upsert({
    id: profile.id,
    data: searchableText,
    metadata: {
      fullName: profile.fullName,
      company: profile.company,
      position: profile.position,
      industry: profile.industry,
      city: profile.city,
      interests: profile.interests,
      lookingFor: profile.lookingFor,
    },
  })
}

// Search for compatible profiles
export async function searchProfiles(query: string, limit = 10) {
  const results = await searchIndex.search(query, {
    limit,
  })
  return results
}

// Find compatible users based on interests
export async function findCompatibleUsers(
  interests: string[],
  lookingFor: string[],
  excludeUserId: string,
  limit = 10,
) {
  const query = [...interests, ...lookingFor].join(" ")
  const results = await searchIndex.search(query, {
    limit: limit + 1, // Get one extra to filter out current user
  })

  return results.filter((r) => r.id !== excludeUserId).slice(0, limit)
}
