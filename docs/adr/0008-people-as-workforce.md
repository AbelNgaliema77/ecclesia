# 8. People as the workforce

Date: 2026-11-07 – Accepted, supersedes the People part of ADR 6

## Context

Churches using Ecclesia manage the people who serve, not a full membership register. Visitor, Regular, Member and Inactive statuses, first-visit dates, preferred names, households and notes added work nobody did, and the teams a person serves in already say what they do.

## Decision

- A person holds first and last name, email, phone, gender, date of birth, the year they joined the church and nothing else. The year is a small integer checked against 1900 and the current year.
- Status, status history, first visit, preferred name, household and notes are removed from the schema. Migration 0007 copies the first-visit year into the joined year before dropping the columns.
- Teams come from assignments, as before. People can be filtered by in a team, leaders and not in a team. Givers who do not serve stay in People without a team, so Finance keeps one list of people.
- A new person can be placed in a team from the add form. Team leaders must choose one of their own teams, so the person stays visible to them.
- Stopping someone serving now takes the day they stop, and the assignment ends the day before, so they leave the team at once. An assignment that had not started yet is removed instead.
- Replace hands a position to someone else in one step: the outgoing assignment ends and the new one starts on the same day, inside one transaction, with the usual capacity checks.

## Consequences

- Membership can return later as its own module without reshaping People.
- The dashboard shows people who joined this year instead of first-time visitors.
