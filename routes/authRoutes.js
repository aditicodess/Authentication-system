const { Router } = require('express');
const authController = require('../controllers/authController');
const {check} = require('express-validator');

const router = Router();

router.get('/signup', authController.signup_get);
router.post('/signup', authController.signup_post);
router.get('/login', authController.login_get);
router.post('/login', authController.login_post);
router.get('/logout', authController.logout_get);
router.get('/forgetPassword', authController.forgetPassword_get);  
router.get('/resetPassword/:id/:token', authController.resetPassword_get);
router.post('/forgetPassword', authController.forgetPassword_post);  
router.post('/resetPassword/:id/:token',  [
    check('password', 'Enter atleast 6 character long password')
        .trim()
        .isLength({ min: 6 }),
    check('password2', 'Email is not valid')
        .trim()
        .custom((value, {req}) => {
            if(value != req.body.password){
                return Promise.reject("Password mismatch")
            }
            return true;
        })
], authController.resetPassword_post);


module.exports = router;