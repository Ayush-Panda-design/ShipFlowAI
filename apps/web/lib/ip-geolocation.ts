export type IpLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
};

function isPrivateIp(ip: string) {
  const normalized = ip.trim().toLowerCase();

  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost"
  ) {
    return true;
  }

  if (normalized.startsWith("10.")) {
    return true;
  }

  if (normalized.startsWith("192.168.")) {
    return true;
  }

  if (normalized.startsWith("172.")) {
    const secondOctet = Number.parseInt(normalized.split(".")[1] ?? "", 10);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  return false;
}

type IpApiResponse = {
  status?: string;
  message?: string;
  country?: string;
  regionName?: string;
  city?: string;
};

export async function lookupIpLocation(
  ipAddress: string | null | undefined,
): Promise<IpLocation | null> {
  const ip = ipAddress?.trim();
  if (!ip || isPrivateIp(ip)) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city`,
      {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as IpApiResponse;
    if (data.status !== "success") {
      return null;
    }

    return {
      city: data.city?.trim() || null,
      region: data.regionName?.trim() || null,
      country: data.country?.trim() || null,
    };
  } catch {
    return null;
  }
}
