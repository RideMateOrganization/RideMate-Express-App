import express from 'express';

const router = express.Router();

// Privacy Policy endpoint
router.get('/', (req, res) => {
  const lastUpdated = new Date().toISOString().split('T')[0];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ridemate Privacy Policy</title>
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
        <h1>Ridemate Privacy Policy</h1>
        <p class="last-updated">Last Updated: ${lastUpdated}</p>
        
        <div class="section">
            <p>This Privacy Policy describes how Ridemate collects, uses, and protects your information when you use our ride-sharing application.</p>
        </div>

        <div class="section">
            <h2>Information We Collect</h2>
            
            <div class="subsection">
                <h3>Personal Information</h3>
                <ul>
                    <li>Name, email address, and phone number for account creation and verification</li>
                    <li>Profile information including profile pictures</li>
                    <li>Payment information (processed securely through third-party payment processors)</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Location Data</h3>
                <ul>
                    <li>Real-time GPS location for ride matching and navigation</li>
                    <li>Pickup and destination addresses</li>
                    <li>Route history for improving service quality</li>
                    <li>Location data is collected only when the app is actively being used for rides</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Device Information</h3>
                <ul>
                    <li>Device type, operating system, and app version</li>
                    <li>Device identifiers for security and analytics</li>
                    <li>Battery level and charging status for optimal ride matching</li>
                    <li>Camera access for profile pictures and document verification</li>
                    <li>Microphone access for in-app communication features</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Usage Data</h3>
                <ul>
                    <li>Ride history, ratings, and feedback</li>
                    <li>App usage patterns and preferences</li>
                    <li>Communication logs between riders and drivers</li>
                    <li>Support ticket information</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>How We Use Your Information</h2>
            
            <div class="subsection">
                <h3>Service Provision</h3>
                <ul>
                    <li>Matching you with nearby drivers</li>
                    <li>Processing payments and transactions</li>
                    <li>Providing real-time navigation and tracking</li>
                    <li>Facilitating communication between riders and drivers</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Safety and Security</h3>
                <ul>
                    <li>Verifying user identity and preventing fraud</li>
                    <li>Monitoring ride safety and quality</li>
                    <li>Investigating incidents and complaints</li>
                    <li>Ensuring compliance with local regulations</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Service Improvement</h3>
                <ul>
                    <li>Analyzing usage patterns to improve our service</li>
                    <li>Developing new features and functionality</li>
                    <li>Conducting research and analytics</li>
                    <li>Personalizing your experience</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Communication</h3>
                <ul>
                    <li>Sending ride updates and notifications</li>
                    <li>Providing customer support</li>
                    <li>Sharing important service announcements</li>
                    <li>Marketing communications (with your consent)</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>Data Sharing</h2>
            
            <div class="subsection">
                <h3>With Drivers</h3>
                <ul>
                    <li>Your name and pickup location (when ride is requested)</li>
                    <li>Destination (when ride is confirmed)</li>
                    <li>Contact information for communication purposes</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>With Service Providers</h3>
                <ul>
                    <li>Payment processors for transaction processing</li>
                    <li>Map and navigation services for routing</li>
                    <li>Communication platforms for notifications</li>
                    <li>Analytics services for app improvement</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Legal Requirements</h3>
                <ul>
                    <li>When required by law or legal process</li>
                    <li>To protect our rights and property</li>
                    <li>In case of emergency situations</li>
                    <li>To comply with regulatory requirements</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>Data Security</h2>
            <p>All data is encrypted in transit and at rest using industry-standard encryption protocols.</p>
            <p>Access to your data is restricted to authorized personnel who need it for legitimate business purposes.</p>
            <p>We retain your data only as long as necessary for the purposes outlined in this policy.</p>
            
            <h3>Security Measures</h3>
            <ul>
                <li>Regular security audits and assessments</li>
                <li>Secure data centers with physical and digital security</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
            </ul>
        </div>

        <div class="section">
            <h2>Your Rights</h2>
            <ul>
                <li><strong>Access:</strong> You can request access to your personal data</li>
                <li><strong>Correction:</strong> You can request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> You can request deletion of your data (subject to legal requirements)</li>
                <li><strong>Portability:</strong> You can request a copy of your data in a portable format</li>
                <li><strong>Opt-out:</strong> You can opt out of marketing communications</li>
                <li><strong>Restrictions:</strong> You can request restrictions on how we process your data</li>
            </ul>
        </div>

        <div class="section">
            <h2>Device Permissions</h2>
            
            <div class="highlight">
                <h3>Location Services</h3>
                <p><strong>Purpose:</strong> Location services are essential for our ride-sharing service to function properly.</p>
                <p><strong>Collection:</strong> We collect your location data when you request a ride, during the ride, and when you rate the ride.</p>
                <p><strong>Sharing:</strong> Location data is shared with your driver for navigation purposes.</p>
                <p><strong>Storage:</strong> Location data is stored securely and deleted according to our retention policy.</p>
                <p><strong>Controls:</strong> You can control location sharing through your device settings, but this may limit app functionality.</p>
            </div>

            <div class="highlight">
                <h3>Camera Access</h3>
                <p><strong>Purpose:</strong> Camera access is used for profile pictures and document verification.</p>
                <p><strong>Usage:</strong> We only access your camera when you explicitly choose to take a photo.</p>
                <p><strong>Storage:</strong> Photos are stored securely and can be deleted upon request.</p>
                <p><strong>Sharing:</strong> Profile pictures may be visible to drivers and other users as part of the service.</p>
            </div>

            <div class="highlight">
                <h3>Battery Optimization</h3>
                <p><strong>Purpose:</strong> Battery level information helps us optimize ride matching and provide better service.</p>
                <p><strong>Collection:</strong> We collect battery status to ensure drivers have sufficient charge for rides.</p>
                <p><strong>Usage:</strong> This information helps prevent ride cancellations due to low battery.</p>
                <p><strong>Privacy:</strong> Battery data is not shared with other users and is used only for service optimization.</p>
            </div>
        </div>

        <div class="section">
            <h2>Children's Privacy</h2>
            <p>Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
        </div>

        <div class="section">
            <h2>International Transfers</h2>
            <p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.</p>
        </div>

        <div class="section">
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes through the app or by email.</p>
        </div>

        <div class="section">
            <h2>Compliance</h2>
            <ul>
                <li>This policy complies with the General Data Protection Regulation (GDPR)</li>
                <li>This policy complies with the California Consumer Privacy Act (CCPA)</li>
                <li>We comply with all applicable local privacy laws and regulations</li>
            </ul>
        </div>

        <div class="contact-info">
            <h2>Contact Information</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul>
                <li><strong>Email:</strong> privacy@ridemate.com</li>
                <li><strong>Address:</strong> Ridemate Privacy Team, [Your Company Address]</li>
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
