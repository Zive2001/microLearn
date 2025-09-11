export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

export const validateFirstName = (firstName) => {
  if (!firstName) return 'First name is required';
  if (firstName.length < 2) return 'First name must be at least 2 characters';
  if (firstName.length > 50) return 'First name must be less than 50 characters';
  if (!/^[a-zA-Z\s'-]+$/.test(firstName)) return 'First name can only contain letters, spaces, hyphens, and apostrophes';
  return null;
};

export const validateLastName = (lastName) => {
  if (!lastName) return 'Last name is required';
  if (lastName.length < 2) return 'Last name must be at least 2 characters';
  if (lastName.length > 50) return 'Last name must be less than 50 characters';
  if (!/^[a-zA-Z\s'-]+$/.test(lastName)) return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
  return null;
};

export const validateDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) return 'Date of birth is required';
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 13) return 'You must be at least 13 years old';
  if (age > 120) return 'Please enter a valid date of birth';
  
  return null;
};

export const validateLocation = (location) => {
  if (!location) return 'Location is required';
  if (location.length < 2) return 'Location must be at least 2 characters';
  if (location.length > 100) return 'Location must be less than 100 characters';
  return null;
};

export const validateCurrentRole = (currentRole) => {
  if (!currentRole) return 'Current role is required';
  return null;
};

export const validateExperienceLevel = (experienceLevel) => {
  if (!experienceLevel) return 'Experience level is required';
  const validLevels = ['Complete Beginner', 'Some Experience', 'Intermediate', 'Advanced'];
  if (!validLevels.includes(experienceLevel)) return 'Please select a valid experience level';
  return null;
};

export const validateBio = (bio) => {
  if (bio && bio.length > 200) return 'Bio must be less than 200 characters';
  return null;
};

export const validateLearningGoal = (learningGoal) => {
  if (!learningGoal) return 'Learning goal is required';
  return null;
};

export const validateInterestedTopics = (interestedTopics) => {
  if (!interestedTopics || interestedTopics.length === 0) {
    return 'Please select at least one topic of interest';
  }
  if (interestedTopics.length > 8) {
    return 'Please select no more than 8 topics';
  }
  return null;
};

export const validateTimeCommitment = (timeCommitment) => {
  if (!timeCommitment) return 'Time commitment is required';
  return null;
};

export const validateLearningStyle = (learningStyle) => {
  if (!learningStyle) return 'Learning style is required';
  return null;
};

export const validatePreferredSchedule = (preferredSchedule) => {
  if (!preferredSchedule || preferredSchedule.length === 0) {
    return 'Please select at least one preferred learning time';
  }
  return null;
};

export const validateAgreeToTerms = (agreeToTerms) => {
  if (!agreeToTerms) return 'You must agree to the Terms of Service and Privacy Policy';
  return null;
};

export const validateBasicInfo = (formData) => {
  const errors = {};

  const firstNameError = validateFirstName(formData.firstName);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateLastName(formData.lastName);
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;

  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  const agreeToTermsError = validateAgreeToTerms(formData.agreeToTerms);
  if (agreeToTermsError) errors.agreeToTerms = agreeToTermsError;

  return errors;
};

export const validateProfileSetup = (formData) => {
  const errors = {};

  const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);
  if (dateOfBirthError) errors.dateOfBirth = dateOfBirthError;

  const locationError = validateLocation(formData.location);
  if (locationError) errors.location = locationError;

  const currentRoleError = validateCurrentRole(formData.currentRole);
  if (currentRoleError) errors.currentRole = currentRoleError;

  const experienceLevelError = validateExperienceLevel(formData.experienceLevel);
  if (experienceLevelError) errors.experienceLevel = experienceLevelError;

  const bioError = validateBio(formData.bio);
  if (bioError) errors.bio = bioError;

  return errors;
};

export const validateLearningPreferences = (formData) => {
  const errors = {};

  const learningGoalError = validateLearningGoal(formData.learningGoal);
  if (learningGoalError) errors.learningGoal = learningGoalError;

  const interestedTopicsError = validateInterestedTopics(formData.interestedTopics);
  if (interestedTopicsError) errors.interestedTopics = interestedTopicsError;

  const timeCommitmentError = validateTimeCommitment(formData.timeCommitment);
  if (timeCommitmentError) errors.timeCommitment = timeCommitmentError;

  const learningStyleError = validateLearningStyle(formData.learningStyle);
  if (learningStyleError) errors.learningStyle = learningStyleError;

  const preferredScheduleError = validatePreferredSchedule(formData.preferredSchedule);
  if (preferredScheduleError) errors.preferredSchedule = preferredScheduleError;

  return errors;
};

export const validateStep = (stepNumber, formData) => {
  switch (stepNumber) {
    case 1:
      return validateBasicInfo(formData);
    case 2:
      return validateProfileSetup(formData);
    case 3:
      return validateLearningPreferences(formData);
    default:
      return {};
  }
};

export const validateAllSteps = (formData) => {
  const errors = {
    ...validateBasicInfo(formData),
    ...validateProfileSetup(formData),
    ...validateLearningPreferences(formData)
  };

  return errors;
};