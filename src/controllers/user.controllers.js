import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
//method for refresh and access token:
const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId)
      const accessToken = await user.generateAccessToken();
       const refreshToken = await user.generateRefreshToken();
        //save refresh token in database
        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave: false });
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

  console.log("FILES:", req.files);
  // get user detail from frontend
  const { fullname, email, username, password } = req.body;
  console.log("email:", email);

  // validation not empty
  if (
    [fullname, email, username, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check user exist or not
  const exsistingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exsistingUser) {
    throw new ApiError(409, "user with username or email exist");
  }

  // check for avatars:
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is necessary");
  }

  // upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(400, "avatar upload failed");
  }

  // create user object
  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
  });

  // check user created or not in database and removing refresh token and password
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering user");
  }

  // returning response:
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});
const loginUser =asyncHandler(async(req,res)=>{
  //bring data from req body
  const { username, email, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "username or password is required");
  }
  //check username or email exist or not

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "no user");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "invalid password");
  }
  //create access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  //sending refresh token and accesstoken to cokies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  const options={
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .cookie('accessToken',accessToken,options)
  .cookie('refreshToken',refreshToken,options)
  .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,refreshToken,accessToken
        },
        "user logged in successfully"
    )
  )
})
const logoutUser=asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,{
            $set:{refreshToken:undefined}
        }
    )
    
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"user logged out"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken||req.refreshToken
if(!refreshAccessToken){
  throw new ApiError(401,"unauthorise request")
}
try {
  
const decodedToken = jwt.verify(
  incomingRefreshToken,
  process.env.REFRESH_TOKEN_SECRET
);
const user = await User.findById(decodedToken?._id);
if (!user) {
  throw new ApiError(402, "invalid refresh token");
}
if (incomingRefreshToken !== user?.refreshToken) {
  throw new ApiError(401, "invalid refresh token");
}
const options = {
  httpOnly: true,
  secure: true,
};
const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(
  user._id
);
return res
  .status(200)
  .cookie("access token", accessToken, options)
  .cookie("refreshToken", newRefreshToken, options)
  .json(
    new ApiResponse(
      200,
      { accessToken, refreshToken: newRefreshToken },
      "Access token refreshed"
    )
  );
  
} catch (error) {
  throw new ApiError(401,error?.message||"invalid refresh token")
}

})




export { registerUser,loginUser,logoutUser,refreshAccessToken };
