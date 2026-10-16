export const POLICY_VERSION = "2026-10-12";
export const POLICY_EFFECTIVE_DATE = "October 12, 2026";

export interface PolicySection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const REGISTRATION_TERMS: PolicySection[] = [
  {
    id: "your-account",
    title: "Your account and personal information",
    paragraphs: [
      "Provide accurate and complete registration details, including your name, birthdate, contact information, and selected commuter category. Register using your own identity.",
      "Keep your password and email verification codes private. Do not impersonate another person or use someone else’s account.",
    ],
  },
  {
    id: "registration-approval",
    title: "Email verification and account approval",
    paragraphs: [
      "Verifying your email confirms that you can access that email address. It does not approve your account.",
      "After submission, your registration will remain pending while an administrator reviews it. You cannot log in until your account is approved. Submitting a registration does not guarantee approval.",
    ],
  },
  {
    id: "identity-and-discounts",
    title: "Identification and discount eligibility",
    paragraphs: [
      "Any document you submit must be genuine, readable, and belong to you.",
      "Student, Senior Citizen, and PWD applicants must provide supporting documents for their selected category. Regular commuters must provide identification when the registration form requires it.",
      "Your documents and eligibility must be verified before approval. Do not submit altered documents or claim a discount category you are not eligible for.",
    ],
  },
  {
    id: "rejected-registrations",
    title: "Rejected registrations",
    paragraphs: [
      "If your application is rejected, review the reason and follow the instructions provided before applying again.",
      "Repeated rejected applications may temporarily prevent another registration. Follow any retry date or instructions shown by CHATCO.",
    ],
  },
  {
    id: "rides-and-fares",
    title: "Rides, vehicle tracking, and pickup requests",
    paragraphs: [
      "Check your pickup point, destination, and displayed fare before confirming a ride or payment.",
      "Vehicle locations and pickup requests depend on connectivity, route coverage, and participating vehicles. They do not guarantee vehicle availability, an exact arrival time, or a successful pickup.",
    ],
  },
  {
    id: "payments",
    title: "Payments, receipts, and payment concerns",
    paragraphs: [
      "For GCash payments, follow the payment instructions and check the final transaction status before assuming your fare has been paid. Payment provider terms also apply.",
      "For cash payments, keep the receipt issued for your ride.",
      "If a payment fails or a charge appears incorrect, report the concern through CHATCO’s available support or feedback options. Include your receipt or transaction reference. Reporting a concern does not automatically confirm a refund.",
    ],
  },
  {
    id: "ride-rewards",
    title: "Ride rewards and vouchers",
    paragraphs: [
      "Claim rewards only for eligible rides you personally paid for.",
      "Eligible GCash payments through your account count automatically. For cash rides, use the receipt QR or manual claim code when available. Do not claim another person’s receipt or attempt to claim the same receipt more than once.",
      "Check the reward target, voucher validity, and redemption conditions displayed in CHATCO before using a voucher.",
    ],
  },
  {
    id: "safety-and-conduct",
    title: "Safety and responsible use",
    paragraphs: [
      "Use SOS, ride sharing, feedback, and reports honestly and for their intended purposes. Do not submit false emergencies, misleading reports, or abusive content.",
      "Share ride links only with trusted people because a sharing link can reveal ride or location information.",
      "For immediate danger, contact local emergency services directly. A CHATCO SOS alert does not guarantee an emergency response.",
    ],
  },
  {
    id: "lost-and-found",
    title: "Lost-and-found reports and claims",
    paragraphs: [
      "Provide truthful descriptions when reporting a lost item or claiming a found item. Submit proof of ownership when requested.",
      "Do not claim an item that belongs to someone else. Reports and claims are subject to review, and submitting a report does not guarantee recovery.",
    ],
  },
  {
    id: "privacy-and-permissions",
    title: "Privacy and device permissions",
    paragraphs: [
      "CHATCO uses your registration details and submitted documents to review your account and eligibility. Account, ride, location, payment, and receipt information also supports the features you use, transaction records, rewards, and assistance requests.",
      "Read the Privacy Policy for details about how your information is handled and how to request corrections or account deletion.",
      "Accepting these terms does not automatically enable location, camera, or notifications. These permissions are requested separately when needed. Declining a permission may limit the related feature.",
    ],
  },
  {
    id: "account-restrictions",
    title: "Account misuse and restrictions",
    paragraphs: [
      "False documents, impersonation, fraudulent reward claims, and misuse of safety or reporting features may lead to account review.",
      "CHATCO may restrict or suspend access following review of misuse. Contact support if you believe an account restriction is incorrect.",
    ],
  },
  {
    id: "assistance",
    title: "Full policies and assistance",
    paragraphs: [
      "Read the full Terms of Service and Privacy Policy for further details.",
      "For registration, account, payment, or privacy questions, contact eric.chatco@gmail.com. Include enough information to identify your concern, but never send your password or verification codes.",
    ],
  },
];

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    id: "account-information",
    title: "Your account information",
    paragraphs: [
      "CHATCO uses the information you provide when creating and using your account, including your name, birthdate, gender, email address, contact number, username, and commuter category. This information helps identify your account and connect your rides, receipts, and rewards to you.",
      "Information you submit through feedback, support requests, or lost-and-found reports helps the team respond to your concern.",
    ],
  },
  {
    id: "registration-verification",
    title: "Registration, identification, and agreements",
    paragraphs: [
      "Your email verification confirms access to your email address. Authorized administrators review your registration details and any submitted identification to verify your account and eligibility for your selected commuter category.",
      "Student, Senior Citizen, and PWD applicants provide supporting documents. Regular commuters provide identification when required by the registration form. Camera access is requested only if you choose to take an ID photo; you can upload an existing image instead.",
      "When you confirm registration, CHATCO records the versions of the Terms of Service and Privacy Policy presented to you, along with the times of your agreement, privacy acknowledgment, and registration declaration.",
    ],
  },
  {
    id: "ride-and-location",
    title: "Ride and location information",
    paragraphs: [
      "Ride information can include your pickup and drop-off points, fare, payment status, and ride history. Location features use location access to help find nearby jeepneys and send pickup requests.",
      "Share My Ride lets someone with your sharing link follow the ride. Share that link only with people you trust. Emergency features can include your location when you request assistance.",
    ],
  },
  {
    id: "payments-and-rewards",
    title: "Payments, receipts, and rewards",
    paragraphs: [
      "CHATCO keeps transaction and receipt information so you can check your fare, payment status, and ride records. GCash payments are completed through the payment provider, whose own privacy terms also apply.",
      "Eligible GCash payments through your account count toward ride rewards automatically. For cash payments, claiming your receipt QR or manual code from your signed-in account links the eligible paid ride to your reward progress.",
    ],
  },
  {
    id: "service-information",
    title: "Information used to run the service",
    paragraphs: [
      "The service uses session and device information to keep you signed in and support account access. Information needed to process payments, deliver ride features, and resolve reports may be handled by the services and personnel supporting those features.",
      "Avoid including passwords, verification codes, payment credentials, or unrelated personal information in feedback and public reports.",
    ],
  },
  {
    id: "your-choices",
    title: "Your choices and questions",
    paragraphs: [
      "Accepting the terms does not automatically enable location, camera, or notifications. Permissions are requested separately when needed, and you can manage them through your browser or device settings. Turning off a permission can limit features that depend on it.",
      "For questions about your information, account corrections, or an account deletion request, contact eric.chatco@gmail.com. Include enough information to identify your account, but never send your password or verification codes.",
    ],
  },
];
