export function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6, color: "#1f2933" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Privacy Policy — Citizen Connect</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>Last updated: September 2026</p>

      <p>
        Citizen Connect ("the App") is a civic engagement platform that lets residents of the constituency
        submit complaints, receive announcements, and interact with their elected representative's office.
        This policy explains what information we collect and how it is used.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Information We Collect</h2>
      <ul>
        <li><strong>Phone number</strong> — used to create your account and verify your identity via OTP.</li>
        <li><strong>Name, address, ward, city, pincode</strong> — provided by you to route complaints and
          communications to the correct ward/department.</li>
        <li><strong>Photos</strong> — attached voluntarily to complaints, your profile, or posts you create in
          the community feed.</li>
        <li><strong>Location</strong> — collected only when you attach it to a complaint, to help staff locate
          the reported issue.</li>
        <li><strong>Push notification token</strong> — used to deliver status updates and announcements to
          your device.</li>
        <li><strong>Content you post</strong> — complaints, feed posts, comments, and reactions you submit
          within the App.</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>How We Use This Information</h2>
      <p>
        Information you provide is used solely to operate the App: routing and resolving complaints, sending
        you status updates and public announcements, and displaying community feed content to other users
        where you have chosen to post publicly. We do not sell your personal information to third parties.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Data Sharing</h2>
      <p>
        Complaint details (including your name, ward, and photos, where relevant) are visible to the
        constituency office staff responsible for resolving the issue. Feed posts are visible according to
        the visibility setting you choose (public, followers-only, or private) when creating them.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Data Retention</h2>
      <p>
        Your account and associated data are retained for as long as your account remains active. You may
        request deletion of your account and associated data by contacting the constituency office using the
        contact details published in the App.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Your Choices</h2>
      <p>
        You may decline to share your precise location or a photo when submitting a complaint, though this
        may make it harder for staff to resolve the issue. You control the visibility of anything you post to
        the community feed.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32 }}>Contact Us</h2>
      <p>
        For any privacy-related questions or data deletion requests, please contact the constituency office
        through the phone number or email published on the App's Home screen.
      </p>
    </div>
  );
}
