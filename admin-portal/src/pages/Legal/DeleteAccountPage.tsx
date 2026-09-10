export function DeleteAccountPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6, color: "#1f2933" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Delete Your Account — Citizen Connect</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>Last updated: September 2026</p>

      <p>
        This page explains how to request deletion of your Citizen Connect account and the personal data
        associated with it.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>How to Request Deletion</h2>
      <ol>
        <li>Send an email to <strong>abbjpjodhpur@gmail.com</strong> (or <strong>abjodhpur@gmail.com</strong>)
          from the phone number registered on your account, or call <strong>+91 9820521222</strong>, with the
          subject "Account Deletion Request".</li>
        <li>Include your registered mobile number so we can locate your account.</li>
        <li>We will verify the request and confirm back to you within <strong>7 business days</strong>.</li>
        <li>Your account and associated personal data will be deleted within <strong>30 days</strong> of
          verified confirmation.</li>
      </ol>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>What Gets Deleted</h2>
      <ul>
        <li>Your profile (name, phone number, address, ward, city, pincode, bio, profile photo)</li>
        <li>Your community feed posts, comments, and reactions</li>
        <li>Photos you uploaded to your profile or to the feed</li>
        <li>Your push notification device token</li>
        <li>Your login credentials and active sessions</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>What May Be Retained</h2>
      <p>
        Complaints you filed are civic records used for tracking municipal issue resolution and public
        accountability. When you request account deletion, your personal identifying details are removed from
        these records, but the complaint itself (issue description, category, ward, resolution status, and
        any photos attached to it) may be retained in an anonymized form for record-keeping and audit
        purposes, consistent with the constituency office's civic reporting obligations. No retained record
        will be linked back to your name, phone number, or account after deletion.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Questions</h2>
      <p>
        For any questions about this process, contact the constituency office at the phone number or email
        above, or see our <a href="/privacy-policy" style={{ color: "#1d4ed8" }}>Privacy Policy</a> for more
        detail on how your data is used.
      </p>
    </div>
  );
}
