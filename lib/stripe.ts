import "server-only"
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null,
    features: ["5 likes por dia", "5 videochamadas por dia", "Perfil básico", "Matches ilimitados"],
    limits: {
      dailyLikes: 5,
      dailyCalls: 5,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 4990, // R$49.90 in cents (was 4900)
    priceId: "price_1SXmhI5n8KRej65vmqpLKo5i", // Real Stripe Price ID
    productId: "prod_TUmDZFhVWmtJeW", // Real Stripe Product ID
    features: [
      "Likes ilimitados",
      "Videochamadas ilimitadas",
      "Perfil destacado",
      "Filtros avançados",
      "Suporte prioritário",
      "7 dias grátis",
    ],
    limits: {
      dailyLikes: Number.POSITIVE_INFINITY,
      dailyCalls: Number.POSITIVE_INFINITY,
    },
  },
}
