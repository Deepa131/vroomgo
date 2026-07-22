const nodemailer = require("nodemailer");

const EMAIL_PASS = (process.env.EMAIL_PASS || "").replace(/\s+/g, "").trim();
const EMAIL_USER = (process.env.EMAIL_USER || "").trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      `Email not sent (missing EMAIL_USER/EMAIL_PASS). Would have sent "${subject}" to ${to}`
    );
    return;
  }
  const mailOptions = {
    from: `VroomGo <${EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendEmail };
