/**
 * Business details shown in the footer and on the policy and contact pages.
 *
 * Anything in [square brackets] is a placeholder. Replace it with your real details, then set
 * `policiesReviewed` to true to remove the "draft" banner from the policy pages.
 * Indian online stores must publish these details (Consumer Protection (E-Commerce) Rules, 2020),
 * and payment gateways such as Razorpay check for them, so have the wording reviewed by a professional.
 */
export const site = {
  name: "Simple & Unique",
  legalName: "[Registered business name]",
  address: "[Registered business address, city, state, PIN code]",
  supportEmail: "[support email address]",
  supportPhone: "[support phone number]",
  supportHours: "[for example, Monday to Saturday, 10 am to 6 pm IST]",
  gstin: "", // optional: shown on the contact page when filled in
  grievanceOfficer: {
    name: "[Grievance Officer name]",
    email: "[grievance email address]",
    phone: "[phone number]",
  },
  // Leave a link empty to hide that icon.
  socials: { instagram: "", facebook: "", youtube: "" },
  policy: {
    deliveryTime: "[X to Y] business days",
    returnWindow: "[N] days",
    refundTime: "[X to Y] business days",
    jurisdiction: "[City], India",
    lastUpdated: "[Month Year]",
  },
  policiesReviewed: false,
} as const;
