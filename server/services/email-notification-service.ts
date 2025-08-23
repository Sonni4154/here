import { MailService } from '@sendgrid/mail';

export class EmailNotificationService {
  private mailService: MailService;

  constructor() {
    this.mailService = new MailService();
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendPunchAdjustmentRequest(
    employeeName: string,
    punchTime: string,
    reason: string,
    adminEmail: string = 'marinpestcontrol@gmail.com'
  ): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set - email notification skipped');
      return false;
    }

    try {
      const msg = {
        to: adminEmail,
        from: 'noreply@marinpestcontrol.com', // Verified sender in SendGrid
        subject: `Punch Clock Adjustment Request - ${employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #dc3545; margin: 0;">⚠️ Punch Clock Adjustment Request</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
              <h3 style="color: #495057; margin-top: 0;">Employee Details</h3>
              <p><strong>Employee:</strong> ${employeeName}</p>
              <p><strong>Punch Time:</strong> ${new Date(punchTime).toLocaleString()}</p>
              <p><strong>Requested At:</strong> ${new Date().toLocaleString()}</p>
              
              <h3 style="color: #495057;">Reason for Adjustment</h3>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #6c757d; margin: 10px 0;">
                ${reason}
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 14px;">
                  Please review this adjustment request in the Admin Portal under Punchclock Logs.
                </p>
                <p style="color: #6c757d; font-size: 14px;">
                  <strong>Next Steps:</strong>
                  <br>• Review the punch details and employee notes
                  <br>• Approve or deny the adjustment request
                  <br>• Update payroll records if necessary
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
              <p>Marin Pest Control - Internal Dashboard</p>
              <p>This is an automated notification from the punch clock system.</p>
            </div>
          </div>
        `,
        text: `
          Punch Clock Adjustment Request
          
          Employee: ${employeeName}
          Punch Time: ${new Date(punchTime).toLocaleString()}
          Requested At: ${new Date().toLocaleString()}
          
          Reason: ${reason}
          
          Please review this adjustment request in the Admin Portal.
        `
      };

      await this.mailService.send(msg);
      console.log(`📧 Punch adjustment email sent for ${employeeName}`);
      return true;

    } catch (error) {
      console.error('Failed to send punch adjustment email:', error);
      return false;
    }
  }

  async sendWeeklyTimecardSummary(
    adminEmail: string = 'marinpestcontrol@gmail.com',
    weeklyData: any[]
  ): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set - email notification skipped');
      return false;
    }

    try {
      const totalHours = weeklyData.reduce((sum, emp) => sum + emp.totalHours, 0);
      const totalPay = weeklyData.reduce((sum, emp) => sum + emp.totalPay, 0);

      const employeeRows = weeklyData.map(emp => `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 8px;">${emp.name}</td>
          <td style="padding: 8px; text-align: center;">${emp.totalHours.toFixed(1)}h</td>
          <td style="padding: 8px; text-align: center;">$${emp.payRate}/hr</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">$${emp.totalPay.toFixed(2)}</td>
        </tr>
      `).join('');

      const msg = {
        to: adminEmail,
        from: 'noreply@marinpestcontrol.com',
        subject: `Weekly Timecard Summary - Week of ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0;">📊 Weekly Timecard Summary</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Week ending ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #495057; margin-top: 0;">Summary Totals</h3>
              <div style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 15px; border-radius: 6px;">
                <div>
                  <strong>Total Hours:</strong> ${totalHours.toFixed(1)} hours
                </div>
                <div>
                  <strong>Total Payroll:</strong> $${totalPay.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
              <h3 style="color: #495057; margin-top: 0;">Employee Breakdown</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">Employee</th>
                    <th style="padding: 12px; text-align: center;">Hours</th>
                    <th style="padding: 12px; text-align: center;">Rate</th>
                    <th style="padding: 12px; text-align: right;">Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  ${employeeRows}
                </tbody>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
              <p>Marin Pest Control - Payroll System</p>
            </div>
          </div>
        `
      };

      await this.mailService.send(msg);
      console.log(`📧 Weekly timecard summary sent`);
      return true;

    } catch (error) {
      console.error('Failed to send weekly timecard summary:', error);
      return false;
    }
  }

  async sendSuspiciousActivityAlert(
    employeeName: string,
    suspiciousFlags: string[],
    details: string,
    adminEmail: string = 'marinpestcontrol@gmail.com'
  ): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set - email notification skipped');
      return false;
    }

    try {
      const msg = {
        to: adminEmail,
        from: 'noreply@marinpestcontrol.com',
        subject: `🚨 Suspicious Punch Activity Detected - ${employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0;">🚨 Suspicious Activity Alert</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
              <h3 style="color: #dc3545; margin-top: 0;">Employee: ${employeeName}</h3>
              
              <h4 style="color: #495057;">Detected Issues:</h4>
              <ul style="color: #dc3545; font-weight: bold;">
                ${suspiciousFlags.map(flag => `<li>${flag}</li>`).join('')}
              </ul>
              
              <h4 style="color: #495057;">Details:</h4>
              <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545;">
                ${details}
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 14px;">
                  <strong>Recommended Actions:</strong>
                  <br>• Review employee schedule and calendar events
                  <br>• Verify punch location and device information
                  <br>• Contact employee for clarification if needed
                  <br>• Flag for payroll review
                </p>
              </div>
            </div>
          </div>
        `
      };

      await this.mailService.send(msg);
      console.log(`📧 Suspicious activity alert sent for ${employeeName}`);
      return true;

    } catch (error) {
      console.error('Failed to send suspicious activity alert:', error);
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();