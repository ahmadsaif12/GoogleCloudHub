import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    try {
        //get token
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({
                message: 'Authentication required',
            });
        }
         // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach authenticated user to request
        req.user = decoded;

        next();
    } catch (error) {
        console.error('JWT authentication error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expired',
            });
        }
        return res.status(401).json({
            message: 'Invalid token',
        });
    }
};

