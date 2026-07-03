import { getUserAnalytics } from "@repo/services";

export async function fetchUserAnalytics(userId: string) {
  const user = await import("@/lib/db").then(({ prisma }) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    }),
  );

  if (!user) {
    return null;
  }

  const analytics = await getUserAnalytics(userId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      signedUpAt: user.createdAt.toISOString(),
    },
    analytics,
  };
}
