const nodemailer = require('nodemailer');
const { FROM_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for others
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html
  });
  return info;
}

function welcomeForAdminTemplate({ name, email, phone, password,customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Gnet E-commerce</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    You have been added as an administrative staff to Gnet E-commerce. We're excited to have you on board!
                  </p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Login Credentials:</h3>
                    <table cellpadding="8" cellspacing="0" width="100%">
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">ID:</td>
                        <td style="color: #333;">${customId}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">Email:</td>
                        <td style="color: #333;">${email}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Phone:</td>
                        <td style="color: #333;">${phone}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Password:</td>
                        <td style="color: #333;">${password}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #666666; line-height: 1.6;">
                    For security reasons, please login and change your password immediately.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Dashboard</a>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions, please contact our support team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function otpEmailTemplate({ code }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Email Verification</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Verify Your Email</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for registering with Gnet E-commerce. Use the following OTP code to complete your verification:
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <div style="display: inline-block; background-color: #f8f9fa; padding: 15px 30px; border: 2px dashed #4facfe; border-radius: 8px;">
                      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333333;">${code}</div>
                    </div>
                  </div>
                  
                  <p style="color: #ff6b6b; text-align: center; font-size: 14px;">
                    This code will expire in ${process.env.OTP_EXPIRES_MIN || 10} minutes.
                  </p>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you didn't request this code, please ignore this email or contact support if you have concerns.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function welcomeForUserTemplate({ name, email, phone, password,customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Gnet E-commerce</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for joining Gnet E-commerce! Your account has been successfully verified and is now active.
                  </p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Account Details:</h3>
                    <table cellpadding="8" cellspacing="0" width="100%">
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">ID:</td>
                        <td style="color: #333;">${customId}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">Email:</td>
                        <td style="color: #333;">${email}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Phone:</td>
                        <td style="color: #333;">${phone}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Password:</td>
                        <td style="color: #333;">${password}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #666666; line-height: 1.6;">
                    For your security, we recommend changing your password after your first login.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Shopping</a>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    Happy shopping! If you need any assistance, our support team is here to help.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycSubmissionTemplate({ name, email, phone, personalAddress, businessDetails }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Submission Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">KYC Submission Received</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for submitting your KYC documents! We have received your application and our team will review it shortly.
                  </p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Submitted Details:</h3>
                    <table cellpadding="8" cellspacing="0" width="100%">
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">Name:</td>
                        <td style="color: #333;">${name}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Email:</td>
                        <td style="color: #333;">${email}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Phone:</td>
                        <td style="color: #333;">${phone}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Personal Address:</td>
                        <td style="color: #333;">${personalAddress}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Business:</td>
                        <td style="color: #333;">${businessDetails}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background-color: #e8f4fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">What's Next?</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 10px;">
                      Our admin team will carefully review your submitted documents and verify all the information. 
                      This process typically takes 24-48 business hours.
                    </p>
                    <p style="color: #666666; line-height: 1.6;">
                      You will receive an email notification once your KYC is approved or if any additional information is required.
                    </p>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions or need to update any information, please contact our support team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycApprovalTemplate({ name, email }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Approved - Welcome to Gnet</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🎉 KYC Approved!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Congratulations ${name}!</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Great news! Your KYC verification has been successfully completed and approved. 
                    You are now officially a verified vendor on Gnet E-commerce platform.
                  </p>
                  
                  <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2E7D32; margin-top: 0;">Welcome to Gnet E-commerce!</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 15px;">
                      As a verified vendor, you now have access to:
                    </p>
                    <ul style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Complete vendor dashboard</li>
                      <li>Product listing and management</li>
                      <li>Order processing and tracking</li>
                      <li>Analytics and reporting</li>
                      <li>24/7 customer support</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Access Your Dashboard</a>
                  </div>
                  
                  <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">Professional Note</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 0;">
                      We're excited to have you as part of our vendor community. Your commitment to providing quality products 
                      and excellent service will help us build a trusted marketplace for our customers.
                    </p>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions or need assistance getting started, our support team is here to help.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycRejectionTemplate({ name, email, rejectionReason }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Review Required</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">KYC Review Required</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for submitting your KYC documents. After careful review, we need some additional information 
                    or clarification before we can approve your vendor account.
                  </p>
                  
                  <div style="background-color: #ffeaea; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ff6b6b;">
                    <h3 style="color: #d32f2f; margin-top: 0;">Review Notes:</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 0;">
                      ${rejectionReason || 'Please review your submitted documents and ensure all information is accurate and complete.'}
                    </p>
                  </div>
                  
                  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">Next Steps:</h3>
                    <ol style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Review the feedback provided above</li>
                      <li>Update your KYC information as needed</li>
                      <li>Resubmit your application</li>
                      <li>Our team will review it again within 24-48 business hours</li>
                    </ol>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Update KYC Information</a>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions about the review process or need assistance, please contact our support team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function welcomeForIndividualTemplate({ name, email, phone, password, customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce - Individual Account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Gnet E-commerce</h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Individual Account</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Welcome to Gnet E-commerce as an Individual user! Your account has been successfully verified and is now active.
                  </p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Account Details:</h3>
                    <p style="margin: 5px 0; color: #666666;"><strong>Name:</strong> ${name}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Phone:</strong> ${phone}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Account ID:</strong> ${customId}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Role:</strong> Individual User</p>
                  </div>
                  
                  <div style="background-color: #e8f4fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">Your Login Credentials:</h3>
                    <p style="margin: 5px 0; color: #666666;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Password:</strong> ${password}</p>
                    <p style="color: #d32f2f; font-size: 14px; margin-top: 15px;">
                      <strong>⚠️ Important:</strong> Please change your password after your first login for security.
                    </p>
                  </div>
                  
                  <div style="background-color: #f3e5f5; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #7b1fa2; margin-top: 0;">What's Next?</h3>
                    <ul style="color: #666666; line-height: 1.6;">
                      <li>Complete your KYC verification to access all features</li>
                      <li>Upload your Aadhar card and profile photo</li>
                      <li>Record a short verification video</li>
                      <li>Start using our platform services</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/login" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      Login to Your Account
                    </a>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; text-align: center; margin-top: 30px;">
                    If you have any questions, please contact our support team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 14px; margin: 0;">
                    © 2024 Gnet E-commerce. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function welcomeForVendorTemplate({ businessName, contactPerson, email, phone, password, customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce - Vendor Account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Gnet E-commerce</h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Vendor Account Verified</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${contactPerson},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Congratulations! Your vendor registration for <strong>${businessName}</strong> has been successfully verified. 
                    You are now officially part of the Gnet E-commerce vendor community!
                  </p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Business Details:</h3>
                    <p style="margin: 5px 0; color: #666666;"><strong>Business Name:</strong> ${businessName}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Contact Person:</strong> ${contactPerson}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Phone:</strong> ${phone}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Vendor ID:</strong> ${customId}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">Verified ✅</span></p>
                  </div>
                  
                  <div style="background-color: #e8f4fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">Your Login Credentials:</h3>
                    <p style="margin: 5px 0; color: #666666;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #666666;"><strong>Password:</strong> ${password}</p>
                    <p style="color: #d32f2f; font-size: 14px; margin-top: 15px;">
                      <strong>⚠️ Important:</strong> Please change your password after your first login for security.
                    </p>
                  </div>
                  
                  <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2E7D32; margin-top: 0;">🚀 What You Can Do Now:</h3>
                    <ul style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Access your vendor dashboard</li>
                      <li>List your products and services</li>
                      <li>Manage orders and inventory</li>
                      <li>Track sales and analytics</li>
                      <li>Communicate with customers</li>
                      <li>Access 24/7 vendor support</li>
                    </ul>
                  </div>
                  
                  <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">📋 Next Steps:</h3>
                    <ol style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Complete your business profile</li>
                      <li>Upload product catalog</li>
                      <li>Set up payment methods</li>
                      <li>Configure shipping options</li>
                      <li>Start receiving orders!</li>
                    </ol>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/vendor/login" 
                       style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      Access Vendor Dashboard
                    </a>
                  </div>
                  
                  <p style="color: #999999; font-size: 14px; text-align: center; margin-top: 30px;">
                    Welcome to the Gnet E-commerce family! If you have any questions, our vendor support team is here to help.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 14px; margin: 0;">
                    © 2024 Gnet E-commerce. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = {
  sendMail,
  welcomeForAdminTemplate,
  otpEmailTemplate,
  welcomeForUserTemplate,
  welcomeForIndividualTemplate,
  welcomeForVendorTemplate,
  kycSubmissionTemplate,
  kycApprovalTemplate,
  kycRejectionTemplate
};