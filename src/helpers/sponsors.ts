export function resolveSponsor(
  text: string,
  sponsors: any[]
): string | undefined {
  let sponsorId: string | undefined;
  for (let { regex, company } of sponsors) {
    let match = regex.test(text);

    if (match) {
      sponsorId = company;
      break;
    }
  }

  return sponsorId;
}

// async function addSponsorSpot();
