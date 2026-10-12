import { expect, it } from "vitest";
import { emailSchema } from "./email.schema.js";

const payload = {
  to: "user@example.com",
  data: { name: "David", actionUrl: "https://solaria.example/action" },
};

it.each([
  "not a url",
  "file:///etc/passwd",
  "http://localhost/image.png",
  "https://user:secret@example.com/image.png",
  "data:image/png;base64,test",
])("rejects unsafe model image %s", (modelImageUrl) => {
  expect(
    emailSchema.safeParse({
      ...payload,
      template: "solar-model-approved",
      data: { ...payload.data, modelName: "Solar 550 W", modelImageUrl },
    }).success,
  ).toBe(false);
});

it("allows a deletion notice without an action but requires one for verification", () => {
  const data = { name: "David" };
  expect(
    emailSchema.safeParse({ ...payload, template: "user-deletion", data })
      .success,
  ).toBe(true);
  expect(
    emailSchema.safeParse({ ...payload, template: "email-verification", data })
      .success,
  ).toBe(false);
});

it.each([
  ["company-email-verification", "companyName"],
  ["solar-model-approved", "modelName"],
  ["registration-rejected", "reason"],
])("requires the business context for %s", (template, field) => {
  expect(emailSchema.safeParse({ ...payload, template }).success).toBe(false);
  expect(
    emailSchema.safeParse({
      ...payload,
      template,
      data: { ...payload.data, [field]: "Valid context" },
    }).success,
  ).toBe(true);
});

it("rejects multiline rejection reasons", () => {
  expect(
    emailSchema.safeParse({
      ...payload,
      template: "registration-rejected",
      data: { ...payload.data, reason: "Invalid\ncontent" },
    }).success,
  ).toBe(false);
});

it("project invitations require context, a role and an expiry", () => {
  expect(
    emailSchema.safeParse({ ...payload, template: "project-invitation" })
      .success,
  ).toBe(false);
  expect(
    emailSchema.safeParse({
      ...payload,
      template: "project-invitation",
      data: {
        ...payload.data,
        projectName: "Projeto",
        projectRole: "OWNER",
        invitationExpiresAt: "2026-10-19T12:00:00Z",
      },
    }).success,
  ).toBe(false);
  expect(
    emailSchema.safeParse({
      ...payload,
      template: "project-invitation",
      data: {
        ...payload.data,
        projectName: "Projeto",
        projectRole: "MEMBER",
        invitationExpiresAt: "2026-10-19T12:00:00Z",
      },
    }).success,
  ).toBe(true);
});
