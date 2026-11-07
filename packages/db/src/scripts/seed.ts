import { en, en_ZA, Faker, fr } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray } from "drizzle-orm";
import { createDatabase, withChurch } from "../client";
import { attendance, members, people, provisioning, teams } from "../repositories";
import { account, churches, type LocalizedText, user } from "../schema";
import { requireEnv } from "./env";
import { seedFinance } from "./seed-finance";

const DEMO_SLUG = "grace-harbour";
const DEMO_EMAIL = "demo@ecclesia.app";
const DEMO_PASSWORD = "Ecclesia-Demo-2026";
const DEMO_USER_ID = "demo-user";
const LEADER_EMAIL = "leader@ecclesia.app";
const LEADER_USER_ID = "demo-leader";
const TREASURER_EMAIL = "treasurer@ecclesia.app";
const TREASURER_USER_ID = "demo-treasurer";
const PASTOR_EMAIL = "pastor@ecclesia.app";
const PASTOR_USER_ID = "demo-pastor";
const MONTHS_OF_HISTORY = 18;

const owner = createDatabase(requireEnv("DATABASE_OWNER_URL"), { maxConnections: 1 });
const app = createDatabase(requireEnv("DATABASE_URL"), { maxConnections: 2 });

const zaFaker = new Faker({ locale: [en_ZA, en], seed: 2026 });
const frFaker = new Faker({ locale: [fr, en], seed: 1974 });
const rng = new Faker({ locale: [en], seed: 7 });

const TEAMS: {
  name: LocalizedText;
  color: string;
  roles: { name: LocalizedText; lead?: boolean; size: number }[];
}[] = [
  {
    name: { en: "Worship", fr: "Louange" },
    color: "#7c3aed",
    roles: [
      { name: { en: "Worship Leader", fr: "Conducteur de louange" }, lead: true, size: 1 },
      { name: { en: "Vocalist", fr: "Choriste" }, size: 8 },
      { name: { en: "Musician", fr: "Musicien" }, size: 5 },
    ],
  },
  {
    name: { en: "Ushering", fr: "Accueil et protocole" },
    color: "#0891b2",
    roles: [
      { name: { en: "Head Usher", fr: "Chef du protocole" }, lead: true, size: 1 },
      { name: { en: "Usher", fr: "Membre du protocole" }, size: 10 },
    ],
  },
  {
    name: { en: "Media", fr: "Médias" },
    color: "#ea580c",
    roles: [
      { name: { en: "Media Lead", fr: "Responsable médias" }, lead: true, size: 1 },
      { name: { en: "Sound Engineer", fr: "Ingénieur du son" }, size: 3 },
      { name: { en: "Camera Operator", fr: "Caméraman" }, size: 3 },
    ],
  },
  {
    name: { en: "Finance", fr: "Finances" },
    color: "#0f766e",
    roles: [
      { name: { en: "Treasurer", fr: "Trésorier" }, lead: true, size: 1 },
      { name: { en: "Counter", fr: "Compteur" }, size: 3 },
    ],
  },
  {
    name: { en: "Children's Ministry", fr: "Ministère des enfants" },
    color: "#16a34a",
    roles: [
      { name: { en: "Children's Pastor", fr: "Pasteur des enfants" }, lead: true, size: 1 },
      { name: { en: "Sunday School Teacher", fr: "Moniteur" }, size: 6 },
    ],
  },
  {
    name: { en: "Youth", fr: "Jeunesse" },
    color: "#e11d48",
    roles: [
      { name: { en: "Youth Pastor", fr: "Pasteur de jeunesse" }, lead: true, size: 1 },
      { name: { en: "Youth Coordinator", fr: "Coordinateur jeunesse" }, size: 4 },
    ],
  },
  {
    name: { en: "Intercession", fr: "Intercession" },
    color: "#4f46e5",
    roles: [
      { name: { en: "Prayer Coordinator", fr: "Coordinateur de prière" }, lead: true, size: 1 },
      { name: { en: "Intercessor", fr: "Intercesseur" }, size: 8 },
    ],
  },
];

const seasonalFactor = (date: Date): number => {
  const month = date.getUTCMonth();
  if (month === 3) return 1.18;
  if (month === 11) return 0.86;
  if (month === 0) return 0.9;
  if (month === 6) return 0.94;
  return 1;
};

const removeExistingDemo = async () => {
  await owner.delete(churches).where(eq(churches.slug, DEMO_SLUG));
  await owner
    .delete(user)
    .where(inArray(user.id, [DEMO_USER_ID, LEADER_USER_ID, TREASURER_USER_ID, PASTOR_USER_ID]));
};

const createDemoUser = async (id: string, name: string, email: string) => {
  await owner.insert(user).values({ id, name, email, emailVerified: true, locale: "en" });
  await owner.insert(account).values({
    id: `${id}-account`,
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEMO_PASSWORD),
  });
};

const sundaysBetween = (from: Date, to: Date, weekday: number): Date[] => {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor.getUTCDay() !== weekday) cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= to) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
};

const atLocalTime = (day: Date, hhmm: string): Date => {
  const [h = "0", m = "0"] = hhmm.split(":");
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Number(h) - 2, Number(m)),
  );
};

await removeExistingDemo();
await createDemoUser(DEMO_USER_ID, "Demo Admin", DEMO_EMAIL);
await createDemoUser(LEADER_USER_ID, "Demo Team Leader", LEADER_EMAIL);
await createDemoUser(TREASURER_USER_ID, "Demo Treasurer", TREASURER_EMAIL);
await createDemoUser(PASTOR_USER_ID, "Demo Pastor", PASTOR_EMAIL);

const provisioned = await provisioning.provisionChurch(app, {
  name: "Grace Harbour Church",
  slug: DEMO_SLUG,
  defaultLocale: "en",
  ownerUserId: DEMO_USER_ID,
  isDemo: true,
});

const churchId = provisioned.church.id;
const now = new Date();
const historyStart = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_OF_HISTORY, 1),
);

await withChurch(app, churchId, async (tx) => {
  const servingCandidates: string[] = [];
  const everyone: string[] = [];
  for (let i = 0; i < 72; i++) {
    const faker = i % 3 === 0 ? frFaker : zaFaker;
    const gender = faker.helpers.arrayElement(["male", "female"] as const);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();
    const person = await people.insertPerson(tx, {
      firstName,
      lastName,
      gender,
      email: faker.datatype.boolean(0.7)
        ? faker.internet.email({ firstName, lastName, provider: "example.org" }).toLowerCase()
        : null,
      phone: faker.datatype.boolean(0.85)
        ? `+27${faker.string.numeric({ length: 9, allowLeadingZeros: false })}`
        : null,
      dateOfBirth: faker.date.birthdate({ min: 6, max: 78, mode: "age" }),
      joinedYear: rng.number.int({ min: now.getUTCFullYear() - 18, max: now.getUTCFullYear() }),
    });
    if (i < 60) servingCandidates.push(person.id);
    everyone.push(person.id);
  }

  const pool = rng.helpers.shuffle([...servingCandidates]);
  let leaderPersonId: string | null = null;
  let treasurerPersonId: string | null = null;
  let financeTeamId: string | null = null;
  let cursor = 0;
  for (const team of TEAMS) {
    const created = await teams.insertTeam(tx, {
      name: team.name,
      description: null,
      color: team.color,
    });
    if (team.name.en === "Finance") financeTeamId = created.id;
    for (const role of team.roles) {
      const position = await teams.insertPosition(tx, {
        teamId: created.id,
        name: role.name,
        isLeadership: role.lead ?? false,
        maxHolders: role.lead ? 1 : null,
      });
      for (let n = 0; n < role.size; n++) {
        const personId = pool[cursor % pool.length];
        cursor++;
        if (!personId) continue;
        if (role.lead && team.name.en === "Media") leaderPersonId = personId;
        if (role.lead && team.name.en === "Finance") treasurerPersonId = personId;
        await teams.insertAssignment(tx, {
          personId,
          positionId: position.id,
          startsOn: rng.date.between({
            from: historyStart,
            to: new Date(now.getTime() - 30 * 86_400_000),
          }),
          endsOn: null,
        });
      }
    }
  }

  const pastorRole = provisioned.roles.find((r) => r.key === "pastor");
  if (pastorRole) {
    await members.addMember(tx, { userId: PASTOR_USER_ID, roleId: pastorRole.id, personId: null });
  }
  const leaderRole = provisioned.roles.find((r) => r.key === "teamLeader");
  if (leaderRole) {
    await members.addMember(tx, {
      userId: LEADER_USER_ID,
      roleId: leaderRole.id,
      personId: leaderPersonId,
    });
    await members.addMember(tx, {
      userId: TREASURER_USER_ID,
      roleId: leaderRole.id,
      personId: treasurerPersonId,
    });
  }

  const categories = provisioned.categories;
  const baseline: Record<string, number> = {
    Men: 58,
    Women: 82,
    Youth: 34,
    "Sunday School": 41,
    Visitors: 9,
  };

  for (const serviceType of provisioned.serviceTypes) {
    if (serviceType.dayOfWeek === null || serviceType.startsAt === null) continue;
    const isMidweek = serviceType.dayOfWeek !== 0;
    const scale = isMidweek ? 0.38 : serviceType.startsAt.startsWith("08") ? 0.85 : 1.1;
    const days = sundaysBetween(historyStart, now, serviceType.dayOfWeek);
    for (const [index, day] of days.entries()) {
      const occursAt = atLocalTime(day, serviceType.startsAt.slice(0, 5));
      if (occursAt > now) continue;
      const { service } = await attendance.findOrCreateService(tx, {
        serviceTypeId: serviceType.id,
        occursAt,
        title: null,
      });
      const growth = 1 + (index / days.length) * 0.22;
      const entries = categories
        .filter((c) => !(isMidweek && c.name.en === "Sunday School"))
        .map((category) => {
          const base = baseline[category.name.en] ?? 10;
          const noise = rng.number.float({ min: 0.88, max: 1.12 });
          return {
            categoryId: category.id,
            count: Math.max(0, Math.round(base * scale * growth * seasonalFactor(day) * noise)),
          };
        });
      await attendance.saveHeadcounts(tx, service.id, entries, DEMO_USER_ID);
    }
  }

  await seedFinance(tx, { everyone, financeTeamId, historyStart, now });
});

await owner.$client.end();
await app.$client.end();

console.log(`Seeded demo church "Grace Harbour Church"`);
console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`Team leader: ${LEADER_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`Treasurer (leads Finance): ${TREASURER_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`Pastor: ${PASTOR_EMAIL} / ${DEMO_PASSWORD}`);
