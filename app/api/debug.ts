import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== DEBUG API CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  
  try {
    // Test basic response
    const result = {
      success: true,
      message: 'Debug API working',
      timestamp: new Date().toISOString(),
      received: {
        method: req.method,
        body: req.body,
        contentType: req.headers['content-type']
      }
    };
    
    console.log('Sending response:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
