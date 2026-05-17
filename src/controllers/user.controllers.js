import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
  import {uploadOnCloudinary} from '../utils/cloudinary.js'
  import {ApiResponse} from '../utils/ApiResponse.js'
const registerUser=asyncHandler(async(req,res)=>{
 
    //get user detail from frontend
    const {fullname,email,username,password}=req.body
    console.log('email:',email)

    //validation not empty
    if([fullname,email,username,password].some((field)=> field?.trim()===""))
        {
        throw new ApiError(400,"All fields are required")
    }
    //check user exist or not
    const exsistingUser =await User.findOne({
        $or:[{username} , {email}]
    })
    if(exsistingUser){
        throw new ApiError(409,"user with username or email exist")
    }
    //check for avatars:
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is necessary")
    }
    //upload them to cloudinary

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is necessary")
    }

    //create user objet
    const user= await  User.cereate(
        {
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url||"",
            email,
            password,
           username:username.toLowerCase(),

    })
    //check user created or not in database and removing refesh token and password
         const createdUser=  await User.findById(user._id).select(
            "-password -refreshToken"
         )

         if(!createdUser){
            throw new ApiError(500,"something went wrong while registring user")
         }
         //returning response:
         return res.status(201).json(
            newApiResponse (200,createdUser,"user registered successfully")
         )

})
export {registerUser}