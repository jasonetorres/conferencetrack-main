'use client'

import type React from 'react'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfile } from '@/hooks/use-profile'
import { storageService, PROFILE_IMAGES_BUCKET_ID } from '@/lib/appwrite'
import { Trash2, Camera, UserCircle, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'

export default function ProfileSettings() {
	const {
		profile,
		updateProfile,
		uploadProfilePicture,
		refreshProfilePicture,
	} = useProfile()
	const { toast } = useToast()
	const [isUploadingImage, setIsUploadingImage] = useState(false)
	const [isDeletingImage, setIsDeletingImage] = useState(false)
	const [socialInputs, setSocialInputs] = useState<
		Array<{ platform: string; url: string }>
	>([])
	const isInitializedRef = useRef(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Initialize social inputs when the profile loads
	useEffect(() => {
		if (!isInitializedRef.current) {
			if (profile.socials && Object.keys(profile.socials).length > 0) {
				const socialArray = Object.entries(profile.socials).map(
					([platform, url]) => ({
						platform,
						url: url || '',
					})
				)
				setSocialInputs(socialArray)
			} else {
				setSocialInputs([
					{ platform: 'linkedin', url: '' },
					{ platform: 'twitter', url: '' },
				])
			}
			isInitializedRef.current = true
		}
	}, [profile.socials])

	// Only refresh profile picture if we have an ID but no URL after component mount
	// This handles edge cases where the URL wasn't generated during profile load
	useEffect(() => {
		// Only refresh if we have an ID but no URL and this isn't the initial load
		if (
			profile.profilePictureId &&
			!profile.profilePicture &&
			isInitializedRef.current
		) {
			console.log(
				'Profile picture needs refresh, calling refreshProfilePicture'
			)
			refreshProfilePicture()
		}
	}, [profile.profilePictureId, profile.profilePicture, refreshProfilePicture])

	const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		updateProfile({ ...profile, [name]: value })
	}

	const handleSocialChange = (
		index: number,
		field: 'platform' | 'url',
		value: string
	) => {
		const updatedSocials = [...socialInputs]
		updatedSocials[index][field] = value
		setSocialInputs(updatedSocials)

		// Update profile with new socials object
		const socialsObject = updatedSocials.reduce((acc, { platform, url }) => {
			if (platform && url) {
				acc[platform] = url
			}
			return acc
		}, {} as Record<string, string>)

		updateProfile({ ...profile, socials: socialsObject })
	}

	const addSocialInput = () => {
		setSocialInputs([...socialInputs, { platform: '', url: '' }])
	}

	const removeSocialInput = (index: number) => {
		const updatedSocials = [...socialInputs]
		updatedSocials.splice(index, 1)
		setSocialInputs(updatedSocials)

		// Update profile with new socials object
		const socialsObject = updatedSocials.reduce((acc, { platform, url }) => {
			if (platform && url) {
				acc[platform] = url
			}
			return acc
		}, {} as Record<string, string>)

		updateProfile({ ...profile, socials: socialsObject })
	}

	const handleProfilePictureUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Reset file input to ensure we can upload the same file again if needed
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}

		// Show loading state
		setIsUploadingImage(true)

		try {
			// Delete the previous profile picture if the ID exists and looks valid
			// We check length to avoid attempting to delete invalid IDs
			if (profile.profilePictureId && profile.profilePictureId.length > 8) {
				// With our updated deleteFile method, this will handle 404 errors gracefully
				await storageService.deleteFile(
					PROFILE_IMAGES_BUCKET_ID,
					profile.profilePictureId,
					true // Suppress not found errors
				)
				console.log('Previous profile picture deleted or not found')
			}

			// Now upload the new file to Appwrite storage
			const fileId = await uploadProfilePicture(file)

			if (fileId) {
				// Update the profile with the new profile picture ID
				// The updateProfile function will automatically generate the URL
				await updateProfile({
					...profile,
					profilePictureId: fileId,
				})

				// Success notification
				toast({
					title: 'Profile picture updated',
					description: 'Your profile picture has been updated successfully',
				})
			} else {
				throw new Error('Failed to upload profile picture')
			}
		} catch (error) {
			console.error('Failed to process profile picture update:', error)
			toast({
				title: 'Update failed',
				description: 'There was a problem updating your profile picture',
				variant: 'destructive',
			})
		} finally {
			setIsUploadingImage(false)
		}
	}

	const removeProfilePicture = async () => {
		try {
			setIsDeletingImage(true)

			// If there's a profile picture ID, we need to delete it from Appwrite storage
			if (profile.profilePictureId && profile.profilePictureId.length > 8) {
				// With our updated deleteFile method, this will handle 404 errors gracefully
				await storageService.deleteFile(
					PROFILE_IMAGES_BUCKET_ID,
					profile.profilePictureId,
					true // Suppress not found errors
				)
				console.log('Profile picture deleted or not found in storage')
			}

			// Always update the profile to remove the reference, even if deletion from storage failed
			// In the type definition, profilePictureId is string | undefined,
			// but the database layer will convert undefined to null for storage
			await updateProfile({
				...profile,
				profilePictureId: undefined, // The hook will convert this to null for database storage
				profilePicture: undefined,
			})

			// Show success notification
			toast({
				title: 'Profile picture removed',
				description: 'Your profile picture has been removed successfully',
			})
		} catch (error) {
			console.error('Failed to remove profile picture:', error)
			toast({
				title: 'Operation failed',
				description: 'There was a problem removing your profile picture',
				variant: 'destructive',
			})
		} finally {
			setIsDeletingImage(false)
		}
	}

	return (
		<div className='flex justify-center'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='text-xl'>Profile Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<ScrollArea className='h-[calc(100vh-250px)] pr-4'>
						<div className='space-y-6'>
							{/* Profile Picture */}
							<div className='space-y-4'>
								<h3 className='text-sm font-medium'>Profile Picture</h3>
								<div className='flex flex-col items-center gap-4'>
									<div className='relative w-32 h-32 rounded-full overflow-hidden bg-muted'>
										{profile.profilePicture ? (
											<Image
												src={profile.profilePicture || '/placeholder.svg'}
												alt='Profile'
												fill
												className='object-cover'
											/>
										) : (
											<div className='w-full h-full flex items-center justify-center'>
												<UserCircle className='w-16 h-16 text-muted-foreground' />
											</div>
										)}
									</div>
									<div className='flex gap-2'>
										<Button
											variant='outline'
											size='sm'
											onClick={() => fileInputRef.current?.click()}
											disabled={isUploadingImage || isDeletingImage}
										>
											{isUploadingImage ? (
												<>
													<Loader2 className='h-4 w-4 mr-2 animate-spin' />
													Uploading...
												</>
											) : (
												<>
													<Camera className='h-4 w-4 mr-2' />
													{profile.profilePicture
														? 'Change Photo'
														: 'Add Photo'}
												</>
											)}
										</Button>
										{profile.profilePicture && (
											<Button
												variant='outline'
												size='sm'
												onClick={removeProfilePicture}
												disabled={isUploadingImage || isDeletingImage}
											>
												{isDeletingImage ? (
													<>
														<Loader2 className='h-4 w-4 mr-2 animate-spin' />
														Removing...
													</>
												) : (
													<>
														<Trash2 className='h-4 w-4 mr-2' />
														Remove
													</>
												)}
											</Button>
										)}
										<input
											ref={fileInputRef}
											type='file'
											accept='image/*'
											onChange={handleProfilePictureUpload}
											className='hidden'
										/>
									</div>
								</div>
							</div>

							<div className='space-y-4'>
								<h3 className='text-sm font-medium'>Personal Information</h3>
								<div className='grid gap-2'>
									<Label htmlFor='name'>Name</Label>
									<Input
										id='name'
										name='name'
										value={profile.name || ''}
										onChange={handleProfileChange}
										placeholder='Your Name'
									/>
								</div>

								<div className='grid gap-2'>
									<Label htmlFor='title'>Job Title</Label>
									<Input
										id='title'
										name='title'
										value={profile.title || ''}
										onChange={handleProfileChange}
										placeholder='Software Engineer'
									/>
								</div>

								<div className='grid gap-2'>
									<Label htmlFor='company'>Company</Label>
									<Input
										id='company'
										name='company'
										value={profile.company || ''}
										onChange={handleProfileChange}
										placeholder='Acme Inc.'
									/>
								</div>
							</div>

							<div className='space-y-4'>
								<h3 className='text-sm font-medium'>Contact Information</h3>
								<div className='grid gap-2'>
									<Label htmlFor='email'>Email</Label>
									<Input
										id='email'
										name='email'
										type='email'
										value={profile.email || ''}
										onChange={handleProfileChange}
										placeholder='you@example.com'
									/>
								</div>

								<div className='grid gap-2'>
									<Label htmlFor='phone'>Phone</Label>
									<Input
										id='phone'
										name='phone'
										value={profile.phone || ''}
										onChange={handleProfileChange}
										placeholder='+1 (555) 123-4567'
									/>
								</div>
							</div>

							<div className='space-y-4'>
								<h3 className='text-sm font-medium'>Social Media</h3>
								{socialInputs.map((social, index) => (
									<div key={index} className='grid gap-2'>
										<div className='flex items-end gap-2'>
											<div className='flex-1'>
												<Label
													htmlFor={`platform-${index}`}
													className='text-xs'
												>
													Platform
												</Label>
												<Input
													id={`platform-${index}`}
													value={social.platform}
													onChange={(e) =>
														handleSocialChange(
															index,
															'platform',
															e.target.value
														)
													}
													placeholder='linkedin'
													className='h-9'
												/>
											</div>
											<div className='flex-1'>
												<Label htmlFor={`url-${index}`} className='text-xs'>
													URL
												</Label>
												<Input
													id={`url-${index}`}
													value={social.url}
													onChange={(e) =>
														handleSocialChange(index, 'url', e.target.value)
													}
													placeholder='https://linkedin.com/in/username'
													className='h-9'
												/>
											</div>
											<Button
												variant='ghost'
												size='icon'
												onClick={() => removeSocialInput(index)}
												aria-label='Remove social media'
												className='h-9 w-9 flex-shrink-0'
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</div>
								))}

								<Button
									variant='outline'
									onClick={addSocialInput}
									className='w-full'
								>
									Add Social Media
								</Button>
							</div>
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	)
}
