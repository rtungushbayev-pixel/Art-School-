// English text of the User Agreement and Privacy Policy. It matches the
// Russian text (legal.ts) clause by clause: when you change one, update the
// other. The Russian and Kazakh versions prevail in case of discrepancy.

import type { LegalDoc, LegalDocument } from './legal';

const OPERATOR = 'Kasteyev School of Arts and Design LLP';
const BIN = 'BIN 060140006924';
const APP = 'the KasteyevSchool mobile application';
const ADDRESS = '38A Auezov St., Almaty';
const PHONES = '8 (727) 375 89 22, 8 (778) 200 82 42';
const EMAIL = 'info@kasteyev.kz';
const CONTACT = `through the Help section of the Application or by email at ${EMAIL}`;
const REQUISITES = `${OPERATOR}, ${BIN}, address: ${ADDRESS}, tel.: ${PHONES}, email: ${EMAIL}`;
const UPDATED = 'Version of 15 October 2026';

export const LEGAL_EN: Record<LegalDoc, LegalDocument> = {
  terms: {
    title: 'User Agreement',
    updated: UPDATED,
    sections: [
      {
        title: '1. General provisions',
        paragraphs: [
          `1.1. This User Agreement (the "Agreement") governs the relationship between ${OPERATOR}, ${BIN} (the "School"), and the user who has installed and uses ${APP} (the "Application").`,
          '1.2. The Agreement is a contract of adhesion within the meaning of Article 389 of the Civil Code of the Republic of Kazakhstan. The user accepts it in full by ticking the consent box during registration and tapping "Sign up". From that moment the Agreement is deemed concluded.',
          '1.3. The Privacy Policy of the Application is an integral part of the Agreement.',
          '1.4. A user under 18 uses the Application with the consent of a parent or other legal representative. The legal representative gives such consent in the paid tuition agreement with the School or a supplementary agreement to it (including those signed electronically via the TrustMe service) and is responsible for the child complying with the Agreement.',
          '1.5. This English text is provided for convenience. In case of any discrepancy, the Russian and Kazakh versions prevail.',
        ],
      },
      {
        title: '2. Purpose of the Application',
        paragraphs: [
          '2.1. The Application is intended for students of the School, their parents (legal representatives) and School staff. It allows users to view the schedule and attendance, receive announcements and notifications, publish creative works and stories in the Community, keep a portfolio, communicate with other users and contact the School.',
          '2.2. The Application is provided free of charge.',
        ],
      },
      {
        title: '3. Registration and account',
        paragraphs: [
          '3.1. Registration is possible only with a code issued by the School: a student uses a student code, a parent uses a parent code, and a staff member uses an invitation from the administration.',
          `3.2. The user provides accurate information and does not share their code, login or password with others. The user reports any suspected unauthorised access to their account to the School ${CONTACT}.`,
          '3.3. The user may delete their account in the Application at any time (Profile → "Delete account"). Their posts, comments, photos and other data are deleted together with it, except for data the School is required by law to keep (for example, attendance records).',
        ],
      },
      {
        title: '4. Rules of conduct and publications',
        paragraphs: [
          '4.1. The user may publish photos of their works, photos from classes, exhibitions and competitions, stories and comments. By publishing materials, the user confirms that they created them or have the right to publish them, and that the people in the photos agree to the publication.',
          '4.2. It is prohibited to publish or send: explicit or sexual content; scenes of violence and cruelty; information harmful to the health and development of children; insults, bullying, threats or hate; advertising and spam; other people’s personal data (phone numbers, addresses, documents); other people’s works presented as one’s own; any materials that violate the laws of the Republic of Kazakhstan.',
          '4.3. Posts and stories undergo automatic review and, where necessary, review by a School employee. The School may decline to publish, hide or delete material that violates the Agreement and, in case of repeated or serious violations, restrict the user’s access to Community features.',
          '4.4. The user may report a post or block another user. Reports are reviewed by School staff.',
        ],
      },
      {
        title: '5. Rights to materials',
        paragraphs: [
          '5.1. Rights to the works published by the user remain with their author, unless otherwise provided by the paid tuition agreement (including the selection and use of the best student works for the School’s methodological collection).',
          '5.2. By publishing a work, the user grants the School a free, non-exclusive right to display it in the Application to other users in accordance with the selected privacy settings, for as long as the work remains published. Use of works and photos outside the Application (exhibitions, website, social media, School advertising) is governed by the paid tuition agreement or by separate consent of the author and their legal representative.',
          '5.3. The name, logo, design and program code of the Application belong to the School or are used by it on lawful grounds.',
        ],
      },
      {
        title: '6. Liability',
        paragraphs: [
          '6.1. The School takes reasonable measures to keep the Application running smoothly but is not liable for interruptions and failures caused by telecom operators, third-party services or force majeure, or for temporary unavailability during updates.',
          '6.2. The School is not the author of materials published by users and takes measures to remove materials that violate the Agreement once it becomes aware of them.',
          '6.3. The schedule and attendance shown in the Application are for information purposes. In case of discrepancy, the School’s records and the terms of the paid tuition agreement prevail.',
          '6.4. Limitations of liability under the Agreement apply to the extent permitted by the laws of the Republic of Kazakhstan, including consumer protection law.',
        ],
      },
      {
        title: '7. Changes to the Agreement',
        paragraphs: [
          '7.1. The School may amend the Agreement. The School announces material changes in the Application at least 10 calendar days before they take effect. If the user does not agree with the changes, they may delete their account; continued use of the Application after the changes take effect means acceptance of them.',
        ],
      },
      {
        title: '8. Governing law and contacts',
        paragraphs: [
          '8.1. The Agreement is governed by the laws of the Republic of Kazakhstan. Disputes are resolved through negotiation, including by written claim, to which the School responds within 15 calendar days. If no agreement is reached, the dispute is heard by a court of the Republic of Kazakhstan under the jurisdiction rules established by law, preserving the consumer’s right to choose the court.',
          `8.2. Questions and claims regarding the Agreement should be sent ${CONTACT}.`,
          `8.3. Details: ${REQUISITES}.`,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: UPDATED,
    sections: [
      {
        title: '1. General provisions',
        paragraphs: [
          `1.1. This Policy describes which personal data of users ${OPERATOR}, ${BIN} (the "School") processes in ${APP} (the "Application"), on what basis, for what purposes and how the data is protected.`,
          '1.2. The Policy is drawn up in accordance with the Constitution of the Republic of Kazakhstan, which guarantees the inviolability of private life, Law of the Republic of Kazakhstan No. 94-V of 21 May 2013 "On Personal Data and Their Protection" (the "Law"), the Law of the Republic of Kazakhstan "On the Rights of the Child in the Republic of Kazakhstan" and other legislation. The School is the owner and operator of the database of personal data of Application users.',
          '1.3. The Policy is an integral part of the User Agreement.',
          '1.4. This English text is provided for convenience. In case of any discrepancy, the Russian and Kazakh versions prevail.',
        ],
      },
      {
        title: '2. Consent to processing',
        paragraphs: [
          '2.1. Personal data is processed on the basis of the user’s consent. Consent is given electronically during registration: the user ticks the box agreeing to the Agreement and the Policy and taps "Sign up". The date and version of the documents the user agreed to are recorded.',
          '2.2. Consent covers the data, purposes, third parties and cross-border transfer specified in the Policy and remains valid until the account is deleted or consent is withdrawn.',
          '2.3. For a user under 18, consent is given by their legal representative in the paid tuition agreement or a supplementary agreement to it, which may also be signed electronically via the TrustMe service. The student registration code is issued to the legal representative or with their knowledge.',
          '2.4. Separately from the Application, the School processes the data of students and parents under the paid tuition agreement: records of studies and payments, the access control system, SMS and messenger notifications. Such processing is governed by that agreement. Push notifications of the Application supplement these notifications and can be configured by the user in the Application.',
        ],
      },
      {
        title: '3. What data we collect',
        paragraphs: [
          '3.1. Account data: surname and name (for students, from the School’s list), email address, phone number, role (student, parent, staff member), group and branch.',
          '3.2. Profile data added by the user: profile photo, information about themselves, field of study, the institution they plan to enter.',
          '3.3. User materials: posts and photos of works, stories, comments, likes, lists of friends and blocked users, requests to the Help section.',
          '3.4. Study data: schedule, attendance (including the time of entering a branch or a QR check-in), achievements, teachers’ progress notes.',
          '3.5. Technical data: push notification token, device model and system version (when contacting Help), Application language.',
          '3.6. The Application does not collect location or phone contacts. The camera and gallery are used only when the user takes or selects a photo or scans a QR code.',
          '3.7. The Application does not process biometric data. In the building on Auezov St., entry is recorded by an access control system with face recognition (Face ID) connected to the School’s records (Bitrix24). The parent provides the photo for it under the paid tuition agreement; this processing is carried out by the School outside the Application, and only the entry time is passed to the Application.',
        ],
      },
      {
        title: '4. How we use data',
        paragraphs: [
          '4.1. To provide the features of the Application: sign-in, schedule, attendance, Community, portfolio, requests.',
          '4.2. To inform parents about their child’s attendance and progress, and students and parents about classes, announcements and School replies.',
          '4.3. To check posts and stories for compliance with the rules, protect the honour, dignity and privacy of children, and shield them from information harmful to their health and development.',
          '4.4. To keep attendance records under the paid tuition agreement.',
          '4.5. To ensure the security of the Application and to investigate errors and user requests.',
          '4.6. The School does not use data for advertising and does not make decisions with legal consequences for users solely on the basis of automated processing. Automatic review of posts only determines whether material is shown; disputed cases are checked by a staff member.',
        ],
      },
      {
        title: '5. Who can see the data',
        paragraphs: [
          '5.1. Other users see the name, profile photo and posts in accordance with the "Who can see my posts" setting. Other users do not see phone numbers or email addresses.',
          '5.2. Parents linked to a student see their schedule, attendance, achievements and works.',
          '5.3. School staff see only the data they need for their duties: teaching, reviewing posts, answering requests and keeping attendance records. Staff must keep personal data confidential in accordance with the Labour Code of the Republic of Kazakhstan, their employment contract and the School’s internal rules.',
          '5.4. Personal data of School staff in the Application (name, photo, contact details for communication within the School) is processed with their consent and in accordance with labour law.',
        ],
      },
      {
        title: '6. Transfer of data to third parties and abroad',
        paragraphs: [
          '6.1. The School does not sell personal data. To operate the Application, data is processed on the School’s behalf by service providers who are obliged to ensure its confidentiality and security:',
          '— PS Cloud Services (storage of the Application database and files on servers in the Republic of Kazakhstan);',
          '— Expo and Google Firebase (delivery of push notifications);',
          '— Anthropic (automatic review of photos and texts of posts; under the provider’s terms, data is not used to train models);',
          '— Bitrix24 (the School’s attendance records).',
          '6.2. Users’ personal data is stored in a database located in the Republic of Kazakhstan (Article 12 of the Law). Only the data without which certain features cannot work is transferred outside the Republic of Kazakhstan: the text of a push notification and the technical device identifier to notification delivery services (Expo, Google Firebase); photos and text of a post or story, without the author’s name and contact details, to the automatic review service (Anthropic). By giving consent under section 2, the user (their legal representative) agrees to such cross-border transfer (Article 16 of the Law).',
          '6.3. Data may be disclosed to government authorities in cases provided for by the laws of the Republic of Kazakhstan.',
        ],
      },
      {
        title: '7. Retention and deletion',
        paragraphs: [
          '7.1. Data is kept while the user’s account exists and is destroyed once the purposes of processing are achieved, when the account is deleted or consent is withdrawn, unless the law requires otherwise.',
          '7.2. Stories are deleted automatically 24 hours after publication.',
          '7.3. The user may delete their account in the Application (Profile → "Delete account"). The profile, posts, stories, comments, photos and requests are deleted. Attendance records are kept by the School for the periods established by law for records of educational activities.',
        ],
      },
      {
        title: '8. Data protection',
        paragraphs: [
          '8.1. Data is transmitted over a secure connection. Access to data is restricted by permissions: each user sees only what their role allows. The sign-in session is stored in the phone’s secure storage.',
          '8.2. The School takes legal, organisational and technical measures to protect data against unlawful access, alteration, disclosure and destruction, and appoints a person responsible for organising the processing of personal data.',
          '8.3. In the event of a personal data security breach, the School notifies the authorised body and, where necessary, users within the time limits and in the manner established by the laws of the Republic of Kazakhstan.',
        ],
      },
      {
        title: '9. User rights',
        paragraphs: [
          '9.1. The user (a child’s legal representative) has the right to: know which of their data is processed, by whom and why; demand that it be amended and supplemented, and blocked or destroyed if processed in violation of the Law; withdraw consent to collection, processing and cross-border transfer; protect their rights before the authorised personal data protection body or in court.',
          `9.2. Most data can be changed or deleted directly in the Application. Other requests should be sent ${CONTACT}. The School responds within the time limits established by the Law.`,
          '9.3. Withdrawing consent to the processing of data required for the Application to work means deleting the account.',
        ],
      },
      {
        title: '10. Changes to the Policy and contacts',
        paragraphs: [
          '10.1. The School may amend the Policy. The School announces material changes in the Application before they take effect; if the changes expand the data collected, the purposes or the recipients, the School asks for new consent.',
          `10.2. Owner and operator of the personal data database: ${REQUISITES}. The School, including the person responsible for organising the processing of personal data, can be contacted ${CONTACT}.`,
        ],
      },
    ],
  },
};
