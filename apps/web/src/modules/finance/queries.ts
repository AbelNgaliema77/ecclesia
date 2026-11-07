import "server-only";
import type { Tx } from "@ecclesia/db";
import {
  attendance,
  expenses,
  finance,
  giving,
  ledger,
  people,
  teams,
} from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import {
  addMonths,
  compareBudget,
  EXPENSE_STATUSES,
  type ExpenseStatus,
  GIVING_METHODS,
  type GivingMethod,
  type IsoDate,
  isIsoDate,
  lastDayOfMonth,
  monthOf,
  monthsBetween,
  taxYearEnding,
  taxYearRange,
} from "@ecclesia/domain/finance";
import { notFound } from "next/navigation";
import { readChurch } from "@/server/queries";
import { churchToday } from "./context";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const PAGE_SIZE = 50;

const pageOf = (params: SearchParams) =>
  Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

const isUuid = (value: string | undefined): value is string =>
  value !== undefined && /^[0-9a-f-]{36}$/i.test(value);

const sameDayLastYear = (today: IsoDate): IsoDate => {
  const candidate = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  return isIsoDate(candidate) ? candidate : lastDayOfMonth(`${candidate.slice(0, 7)}-01`);
};

export const loadFinanceOverview = () =>
  readChurch(["giving.readTotals", "payments.approve", "budgets.read"], async (ctx) => {
    const { tx, actor, user } = ctx;
    const today = churchToday(ctx);
    const month = monthOf(today);
    const trendFrom = addMonths(month, -11);
    const year = Number(today.slice(0, 4));
    const canTotals = can(actor, "giving.readTotals");
    const canBudgets = can(actor, "budgets.read");

    const [
      fundRows,
      monthly,
      paidMonthly,
      thisMonth,
      lastMonth,
      lastYear,
      pending,
      batches,
      categories,
    ] = await Promise.all([
      finance.listFunds(tx),
      canTotals ? giving.totalsByMonthAndFund(tx, trendFrom, today) : [],
      canTotals ? expenses.paidByMonth(tx, trendFrom, today) : [],
      canTotals ? giving.givingStats(tx, month, today) : null,
      canTotals
        ? giving.givingStats(tx, addMonths(month, -1), lastDayOfMonth(addMonths(month, -1)))
        : null,
      canTotals ? giving.givingStats(tx, addMonths(month, -12), sameDayLastYear(today)) : null,
      can(actor, "payments.approve") ? expenses.pendingCounts(tx, user.id) : null,
      can(actor, "giving.capture")
        ? giving.listBatches(tx, { statuses: ["draft", "submitted"], limit: 20 })
        : [],
      canBudgets ? finance.listCategories(tx) : [],
    ]);

    const [budget, actual] = canBudgets
      ? await Promise.all([
          ledger.budgetFor(tx, year),
          expenses.paidByCategory(tx, `${year}-01-01`, `${year}-12-31`),
        ])
      : [new Map<string, number>(), []];

    const months = monthsBetween(trendFrom, today);
    const trend = months.map((m) => {
      const key = m.slice(0, 7);
      const byFund = Object.fromEntries(
        monthly.filter((row) => row.month === key).map((row) => [row.fundId, row.totalCents]),
      );
      return {
        month: key,
        incomeCents: Object.values(byFund).reduce((sum, value) => sum + value, 0),
        expenseCents: paidMonthly.find((row) => row.month === key)?.totalCents ?? 0,
        byFund,
      };
    });

    const budgetRows = compareBudget(
      categories.map((c) => c.id),
      budget,
      new Map(actual.map((row) => [row.categoryId, row.totalCents])),
    )
      .filter((row) => row.budgetCents > 0 || row.actualCents > 0)
      .sort((a, b) => (b.usedPercent ?? 999) - (a.usedPercent ?? 999));

    return {
      currency: ctx.membership.currency,
      today,
      funds: fundRows,
      trend,
      stats: canTotals ? { thisMonth, lastMonth, lastYear } : null,
      pending,
      awaitingVerification: batches.filter((b) => b.status === "submitted"),
      drafts: batches.filter((b) => b.status === "draft"),
      budget: canBudgets ? { year, rows: budgetRows, categories } : null,
    };
  });

export type GivingSearch = {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly fundId: string | null;
  readonly method: GivingMethod | null;
  readonly q: string | null;
  readonly voided: boolean;
  readonly page: number;
};

export const parseGivingSearch = (params: SearchParams, today: IsoDate): GivingSearch => {
  const from = first(params.from);
  const to = first(params.to);
  const fund = first(params.fund);
  const method = first(params.method);
  const validFrom = from && isIsoDate(from) ? from : addMonths(monthOf(today), -1);
  const validTo = to && isIsoDate(to) && to >= validFrom ? to : today;
  return {
    from: validFrom,
    to: validTo,
    fundId: isUuid(fund) ? fund : null,
    method: GIVING_METHODS.includes(method as GivingMethod) ? (method as GivingMethod) : null,
    q: first(params.q)?.trim().slice(0, 80) || null,
    voided: first(params.voided) === "1",
    page: pageOf(params),
  };
};

export const loadGiving = (params: SearchParams) =>
  readChurch(["giving.readIndividual", "giving.capture"], async (ctx) => {
    const { tx, actor } = ctx;
    const today = churchToday(ctx);
    const search = parseGivingSearch(params, today);
    const showNames = can(actor, "giving.readIndividual");
    const [fundRows, result, closed] = await Promise.all([
      finance.listFunds(tx),
      giving.listGifts(tx, {
        from: search.from,
        to: search.to,
        fundId: search.fundId,
        method: search.method,
        search: showNames ? search.q : null,
        includeVoided: search.voided,
        limit: PAGE_SIZE,
        offset: (search.page - 1) * PAGE_SIZE,
      }),
      finance.closedMonths(tx),
    ]);
    return {
      currency: ctx.membership.currency,
      today,
      search,
      funds: fundRows,
      rows: result.rows.map((row) => ({
        ...row,
        personFirstName: showNames ? row.personFirstName : null,
        personLastName: showNames ? row.personLastName : null,
        personPreferredName: showNames ? row.personPreferredName : null,
        locked: closed.has(monthOf(row.receivedOn)),
      })),
      total: result.total,
      totalCents: result.totalCents,
      pageSize: PAGE_SIZE,
      showNames,
      canCapture: can(actor, "giving.capture") && ctx.accessLevel === "full",
    };
  });

export const loadBatches = () =>
  readChurch("giving.capture", async (ctx) => {
    const [batches, services] = await Promise.all([
      giving.listBatches(ctx.tx, { limit: 60 }),
      attendance.listRecentServices(ctx.tx, 12),
    ]);
    return {
      currency: ctx.membership.currency,
      today: churchToday(ctx),
      timeZone: ctx.membership.timezone,
      batches,
      services: services.map((s) => ({ id: s.id, occursAt: s.occursAt, name: s.serviceTypeName })),
      canWrite: ctx.accessLevel === "full",
      userId: ctx.user.id,
    };
  });

export const loadBatch = (id: string) =>
  readChurch("giving.capture", async (ctx) => {
    if (!isUuid(id)) notFound();
    const { tx } = ctx;
    const batch = await giving.getBatch(tx, id);
    if (!batch) notFound();
    const [fundRows, closed] = await Promise.all([finance.listFunds(tx), finance.closedMonths(tx)]);
    return {
      currency: ctx.membership.currency,
      today: churchToday(ctx),
      batch,
      funds: fundRows,
      userId: ctx.user.id,
      canWrite: ctx.accessLevel === "full",
      showNames: can(ctx.actor, "giving.readIndividual"),
      locked: closed.has(monthOf(batch.receivedOn)),
    };
  });

export const loadBankImports = () =>
  readChurch("giving.capture", async (ctx) => {
    const [imports, fundRows, settings] = await Promise.all([
      giving.listBankImports(ctx.tx, 20),
      finance.listFunds(ctx.tx, { activeOnly: true }),
      finance.getSettings(ctx.tx),
    ]);
    return {
      currency: ctx.membership.currency,
      imports,
      funds: fundRows,
      defaultFundId: settings.defaultFundId,
      canWrite: ctx.accessLevel === "full",
    };
  });

export const loadDonors = (params: SearchParams) =>
  readChurch("giving.readIndividual", async (ctx) => {
    const today = churchToday(ctx);
    const page = pageOf(params);
    const q = first(params.q)?.trim().slice(0, 80) || null;
    const yearStart = taxYearRange(taxYearEnding(today)).from;
    const result = await giving.listDonors(ctx.tx, {
      search: q,
      yearStart,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return {
      currency: ctx.membership.currency,
      q,
      page,
      pageSize: PAGE_SIZE,
      yearStart,
      ...result,
    };
  });

export const loadDonor = (personId: string) =>
  readChurch("giving.readIndividual", async (ctx) => {
    if (!isUuid(personId)) notFound();
    const { tx } = ctx;
    const today = churchToday(ctx);
    const [person, profile, years, recent, settings] = await Promise.all([
      people.getPerson(tx, personId),
      giving.getDonorProfile(tx, personId),
      giving.yearlyTotalsForPerson(tx, personId),
      giving.listGifts(tx, {
        from: "2000-01-01",
        to: today,
        personId,
        includeVoided: true,
        limit: 25,
        offset: 0,
      }),
      finance.getSettings(tx),
    ]);
    if (!person) notFound();
    const currentTaxYear = taxYearEnding(today);
    const taxYears = [currentTaxYear - 1, currentTaxYear - 2, currentTaxYear - 3];
    const deductible = await Promise.all(
      taxYears.map(async (year) => {
        const range = taxYearRange(year);
        return {
          year,
          totalCents: await ledger.deductibleTotalFor(tx, personId, range.from, range.to),
          certificate: await ledger.getCertificate(tx, personId, year),
        };
      }),
    );
    return {
      currency: ctx.membership.currency,
      today,
      person,
      profile,
      years,
      recent: recent.rows,
      deductible,
      certificatesEnabled: Boolean(settings.pboNumber),
      canEdit: can(ctx.actor, "giving.capture") && ctx.accessLevel === "full",
    };
  });

export const loadCertificates = (params: SearchParams) =>
  readChurch("giving.readIndividual", async (ctx) => {
    const today = churchToday(ctx);
    const current = taxYearEnding(today);
    const requested = Number.parseInt(first(params.year) ?? "", 10);
    const year = requested >= 2000 && requested <= current ? requested : current - 1;
    const range = taxYearRange(year);
    const [rows, settings] = await Promise.all([
      ledger.deductibleTotals(ctx.tx, range.from, range.to),
      finance.getSettings(ctx.tx),
    ]);
    return {
      currency: ctx.membership.currency,
      year,
      years: Array.from({ length: 6 }, (_, index) => current - index),
      range,
      rows,
      settings,
      canIssue: can(ctx.actor, "giving.readIndividual") && ctx.accessLevel === "full",
    };
  });

export const loadCertificate = (personId: string, year: number) =>
  readChurch("giving.readIndividual", async (ctx) => {
    if (!isUuid(personId) || !Number.isInteger(year)) notFound();
    const certificate = await ledger.getCertificate(ctx.tx, personId, year);
    if (!certificate) notFound();
    const [settings, profile, rows] = await Promise.all([
      finance.getSettings(ctx.tx),
      giving.getDonorProfile(ctx.tx, personId),
      ledger.deductibleTotals(ctx.tx, taxYearRange(year).from, taxYearRange(year).to),
    ]);
    const donor = rows.find((row) => row.personId === personId);
    return {
      currency: ctx.membership.currency,
      locale: ctx.membership.defaultLocale,
      certificate,
      settings,
      profile,
      donor,
      range: taxYearRange(year),
      churchName: ctx.membership.churchName,
    };
  });

const EXPENSE_VIEWS = ["mine", "awaiting", "approved", "all"] as const;

export type ExpenseView = (typeof EXPENSE_VIEWS)[number];

export const loadExpenses = (params: SearchParams) =>
  readChurch(["payments.request", "payments.approve"], async (ctx) => {
    const { tx, actor, user } = ctx;
    const canApprove = can(actor, "payments.approve");
    const churchWide = canApprove || broadestScope(actor.grants, "payments.request") === "church";
    const requested = first(params.view);
    const view: ExpenseView = EXPENSE_VIEWS.includes(requested as ExpenseView)
      ? (requested as ExpenseView)
      : canApprove
        ? "awaiting"
        : "mine";
    const statusParam = first(params.status);
    const status = EXPENSE_STATUSES.includes(statusParam as ExpenseStatus)
      ? (statusParam as ExpenseStatus)
      : null;
    const page = pageOf(params);
    const scope =
      churchWide && view !== "mine"
        ? ({ kind: "church" } as const)
        : ({
            kind: "own",
            userId: user.id,
            teamIds: view === "mine" ? [] : actor.ledTeamIds,
          } as const);
    const result = await expenses.listExpenses(tx, {
      scope,
      statuses: view === "approved" ? ["approved"] : status ? [status] : null,
      awaitingUserId: view === "awaiting" && canApprove ? user.id : null,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    return {
      currency: ctx.membership.currency,
      view,
      status,
      page,
      pageSize: PAGE_SIZE,
      canApprove,
      churchWide,
      canRequest: can(actor, "payments.request") && ctx.accessLevel === "full",
      ...result,
    };
  });

export const loadExpenseForm = () =>
  readChurch("payments.request", async (ctx) => {
    const { tx, actor } = ctx;
    const [fundRows, categories, settings, teamRows] = await Promise.all([
      finance.listFunds(tx, { activeOnly: true }),
      finance.listCategories(tx, { activeOnly: true }),
      finance.getSettings(tx),
      teams.listTeamsOverview(tx),
    ]);
    const churchWide = broadestScope(actor.grants, "payments.request") === "church";
    return {
      currency: ctx.membership.currency,
      funds: fundRows,
      categories,
      defaultFundId: settings.defaultFundId,
      secondApprovalAboveCents: settings.secondApprovalAboveCents,
      teams: teamRows
        .filter((team) => churchWide || actor.ledTeamIds.includes(team.id))
        .map((team) => ({ id: team.id, name: team.name })),
      teamRequired: !churchWide,
    };
  });

export const loadExpense = (id: string) =>
  readChurch(["payments.request", "payments.approve"], async (ctx) => {
    if (!isUuid(id)) notFound();
    const { tx, actor, user } = ctx;
    const expense = await expenses.getExpense(tx, id);
    if (!expense) notFound();
    const canApprove = can(actor, "payments.approve");
    const churchWide = canApprove || broadestScope(actor.grants, "payments.request") === "church";
    const visible =
      churchWide ||
      expense.requestedBy === user.id ||
      (expense.teamId !== null && actor.ledTeamIds.includes(expense.teamId));
    if (!visible) notFound();
    const settings = await finance.getSettings(tx);
    const closed = await finance.closedMonths(tx);
    return {
      currency: ctx.membership.currency,
      today: churchToday(ctx),
      expense,
      userId: user.id,
      canApprove,
      secondApprovalAboveCents: settings.secondApprovalAboveCents,
      canWrite: ctx.accessLevel === "full",
      currentMonthClosed: closed.has(monthOf(churchToday(ctx))),
    };
  });

export const loadBudgets = (params: SearchParams) =>
  readChurch("budgets.read", async (ctx) => {
    const today = churchToday(ctx);
    const current = Number(today.slice(0, 4));
    const requested = Number.parseInt(first(params.year) ?? "", 10);
    const year = requested >= current - 5 && requested <= current + 1 ? requested : current;
    const [categories, budget, actual] = await Promise.all([
      finance.listCategories(ctx.tx),
      ledger.budgetFor(ctx.tx, year),
      expenses.paidByCategory(ctx.tx, `${year}-01-01`, `${year}-12-31`),
    ]);
    const rows = compareBudget(
      categories.map((c) => c.id),
      budget,
      new Map(actual.map((row) => [row.categoryId, row.totalCents])),
    );
    return {
      currency: ctx.membership.currency,
      year,
      years: [current + 1, current, current - 1, current - 2],
      categories,
      rows,
      canEdit: can(ctx.actor, "budgets.manage") && ctx.accessLevel === "full",
    };
  });

export type StatementRange = { readonly from: IsoDate; readonly to: IsoDate };

export const parseStatementRange = (params: SearchParams, today: IsoDate): StatementRange => {
  const from = first(params.from);
  const to = first(params.to);
  const defaultFrom = `${today.slice(0, 4)}-01-01`;
  const validFrom = from && isIsoDate(from) ? from : defaultFrom;
  const validTo = to && isIsoDate(to) && to >= validFrom ? to : today;
  return { from: validFrom, to: validTo };
};

export const buildStatement = async (tx: Tx, range: StatementRange) => {
  const [fundRows, categories, income, spending] = await Promise.all([
    finance.listFunds(tx),
    finance.listCategories(tx),
    ledger.incomeByFund(tx, range.from, range.to),
    expenses.paidByCategory(tx, range.from, range.to),
  ]);
  const incomeRows = fundRows
    .map((fund) => ({
      id: fund.id,
      name: fund.name,
      cents: income.find((r) => r.fundId === fund.id)?.totalCents ?? 0,
    }))
    .filter((row) => row.cents !== 0);
  const expenseRows = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      cents: spending.find((r) => r.categoryId === category.id)?.totalCents ?? 0,
    }))
    .filter((row) => row.cents !== 0);
  const totalIncome = incomeRows.reduce((sum, row) => sum + row.cents, 0);
  const totalExpenses = expenseRows.reduce((sum, row) => sum + row.cents, 0);
  return { incomeRows, expenseRows, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
};

export const loadReports = (params: SearchParams) =>
  readChurch("giving.readTotals", async (ctx) => {
    const today = churchToday(ctx);
    const range = parseStatementRange(params, today);
    const [statement, periods] = await Promise.all([
      buildStatement(ctx.tx, range),
      finance.listPeriods(ctx.tx),
    ]);
    const closed = new Set(periods.map((p) => p.month));
    const recentMonths = Array.from({ length: 12 }, (_, index) =>
      addMonths(monthOf(today), -index - 1),
    );
    return {
      currency: ctx.membership.currency,
      churchName: ctx.membership.churchName,
      today,
      range,
      statement,
      periods,
      months: recentMonths.map((month) => ({
        month,
        closed: closed.has(month),
        info: periods.find((p) => p.month === month) ?? null,
      })),
      canClose: can(ctx.actor, "finance.manage") && ctx.accessLevel === "full",
    };
  });

export const loadFinanceSettings = () =>
  readChurch("finance.manage", async (ctx) => {
    const [fundRows, categories, settings, teamRows] = await Promise.all([
      finance.listFunds(ctx.tx),
      finance.listCategories(ctx.tx),
      finance.getSettings(ctx.tx),
      teams.listTeamsOverview(ctx.tx),
    ]);
    return {
      currency: ctx.membership.currency,
      funds: fundRows,
      categories,
      settings,
      teams: teamRows.map((team) => ({ id: team.id, name: team.name })),
      canWrite: ctx.accessLevel === "full",
    };
  });
