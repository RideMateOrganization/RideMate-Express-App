import express from 'express';

const router = express.Router();

// Terms of Service endpoint
router.get('/', (req, res) => {
  const lastUpdated = new Date().toISOString().split('T')[0];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ridemate Terms of Service</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 1.5em;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        
        h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .highlight {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        
        .contact-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .last-updated {
            font-style: italic;
            color: #7f8c8d;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .subsection {
            margin-left: 20px;
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                padding: 15px;
            }
            
            h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ridemate Terms of Service</h1>
        <p class="last-updated">Last Updated: ${lastUpdated}</p>
        
        <div class="section">
            <p>Welcome to Ridemate! These Terms of Service ("Terms") govern your use of our ride-sharing application and services. By using our app, you agree to be bound by these Terms.</p>
        </div>

        <div class="section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using Ridemate, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use our services.</p>
        </div>

        <div class="section">
            <h2>2. Description of Service</h2>
            <p>Ridemate is a ride-sharing platform that connects riders with drivers. We provide:</p>
            <ul>
                <li>Real-time ride matching and booking</li>
                <li>GPS tracking and navigation</li>
                <li>Secure payment processing</li>
                <li>Communication tools between riders and drivers</li>
                <li>Safety features and incident reporting</li>
            </ul>
        </div>

        <div class="section">
            <h2>3. User Accounts</h2>
            
            <div class="subsection">
                <h3>3.1 Account Creation</h3>
                <ul>
                    <li>You must provide accurate and complete information when creating an account</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You must be at least 18 years old to use our service</li>
                    <li>One account per person - multiple accounts are prohibited</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>3.2 Account Security</h3>
                <ul>
                    <li>You are responsible for all activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                    <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>4. User Responsibilities</h2>
            
            <div class="subsection">
                <h3>4.1 For Riders</h3>
                <ul>
                    <li>Provide accurate pickup and destination information</li>
                    <li>Be ready for pickup at the designated time and location</li>
                    <li>Treat drivers with respect and courtesy</li>
                    <li>Pay for rides promptly and accurately</li>
                    <li>Follow all applicable laws and regulations</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>4.2 For Drivers</h3>
                <ul>
                    <li>Maintain a valid driver's license and vehicle registration</li>
                    <li>Ensure your vehicle is in good working condition</li>
                    <li>Provide safe and reliable transportation services</li>
                    <li>Follow all traffic laws and safety regulations</li>
                    <li>Maintain appropriate insurance coverage</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>5. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul>
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Impersonate another person or entity</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Use automated systems to access the service</li>
                <li>Violate any applicable laws or regulations</li>
            </ul>
        </div>

        <div class="section">
            <h2>6. Payment Terms</h2>
            
            <div class="subsection">
                <h3>6.1 Payment Processing</h3>
                <ul>
                    <li>All payments are processed securely through third-party payment processors</li>
                    <li>Ride fares are calculated based on distance, time, and demand</li>
                    <li>Additional fees may apply for tolls, parking, or cleaning</li>
                    <li>Refunds are subject to our refund policy</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>6.2 Pricing</h3>
                <ul>
                    <li>Pricing may vary based on location, time, and demand</li>
                    <li>We reserve the right to change pricing at any time</li>
                    <li>You will be notified of any significant price changes</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>7. Safety and Security</h2>
            
            <div class="highlight">
                <h3>Safety First</h3>
                <p>Your safety is our top priority. We implement various safety measures including:</p>
                <ul>
                    <li>Driver background checks and verification</li>
                    <li>Real-time GPS tracking</li>
                    <li>Emergency contact features</li>
                    <li>Incident reporting system</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>7.1 Emergency Situations</h3>
                <ul>
                    <li>In case of emergency, contact local emergency services immediately</li>
                    <li>Use our in-app emergency features when available</li>
                    <li>Report any safety concerns through our support system</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>8. Privacy and Data Protection</h2>
            <p>Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.</p>
        </div>

        <div class="section">
            <h2>9. Intellectual Property</h2>
            <p>All content, features, and functionality of Ridemate are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not:</p>
            <ul>
                <li>Copy, modify, or distribute our content without permission</li>
                <li>Use our trademarks or logos without authorization</li>
                <li>Reverse engineer or attempt to extract source code</li>
            </ul>
        </div>

        <div class="section">
            <h2>10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Ridemate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising out of or relating to your use of our service.</p>
        </div>

        <div class="section">
            <h2>11. Termination</h2>
            <p>We may terminate or suspend your account and access to our service immediately, without prior notice, for any reason, including if you breach these Terms. Upon termination:</p>
            <ul>
                <li>Your right to use the service will cease immediately</li>
                <li>We may delete your account and data</li>
                <li>You remain liable for all charges incurred before termination</li>
            </ul>
        </div>

        <div class="section">
            <h2>12. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify users of any material changes through the app or by email. Your continued use of the service after such modifications constitutes acceptance of the updated Terms.</p>
        </div>

        <div class="section">
            <h2>13. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to conflict of law principles.</p>
        </div>

        <div class="section">
            <h2>14. Dispute Resolution</h2>
            <p>Any disputes arising from these Terms or your use of our service will be resolved through binding arbitration, except for claims that may be brought in small claims court.</p>
        </div>

        <div class="section">
            <h2>15. Severability</h2>
            <p>If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will remain in full force and effect.</p>
        </div>

        <div class="contact-info">
            <h2>Contact Information</h2>
            <p>If you have any questions about these Terms of Service, please contact us:</p>
            <ul>
                <li><strong>Email:</strong> legal@ridemate.com</li>
                <li><strong>Address:</strong> Ridemate Legal Team, [Your Company Address]</li>
                <li><strong>Phone:</strong> [Your Contact Number]</li>
            </ul>
        </div>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;

