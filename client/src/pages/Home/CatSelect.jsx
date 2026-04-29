import {
	AppBar,
	Box,
	Card,
	Container,
	Dialog,
	Slide,
	Stack,
	Toolbar,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
	TextField,
	Button,
} from "@mui/material";
import React from "react";
import { cats } from "../../data/cats.js";
import { useEffect } from "react";
import { useState } from "react";
import { AttentionSeeker } from "react-awesome-reveal";
import { useContext } from "react";
import AuthContext from "../../contexts/AuthContext.js";

const Transition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="up" ref={ref} {...props} />;
});

export default function CatSelect({ open, handleClose }) {
	const [selected, setSelected] = useState();
	const [catName, setCatName] = useState("");

	const {user} = useContext(AuthContext)

	const handleCreateCat = async () => {
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userId: user.uid,
				name: catName,
				image: selected.img
			})
		}

		const results = await fetch('/api/cats', options)
		const data = await results.json()

		console.log(data)
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('catUpdated', {
					detail: { cat: data },
				}),
			)
		}
		handleClose()
	}

	//useEffect(() => {console.log(selected)}, [selected])

	return (
		<Dialog
			fullScreen
			open={open}
			onClose={handleClose}
			slots={{
				transition: Transition,
			}}
		>
			<AppBar sx={{ position: "relative" }}>
				<Toolbar>
					<Typography sx={{ ml: 2 }} variant="h4">
						Cat Select
					</Typography>
				</Toolbar>
			</AppBar>
			<Container
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					marginTop: "3%",
				}}
			>
				<Stack spacing={2}>
					<Typography variant="h4" align="center">
						Select your cat!
					</Typography>
					<Typography align="center">
						(Don't worry, you can reimagine your cat's name and appeance later!)
					</Typography>

					<TextField
						label="Enter Your Cat's Name!"
						value={catName}
						onChange={(e) => setCatName(e.target.value)}
					/>

					<ToggleButtonGroup
						value={selected}
						exclusive
						onChange={(e, newValue) => {
							if (newValue !== null) {
								setSelected(newValue);
							}
						}}
						sx={{
							display: "flex",
							justifyContent: "center",
							gap: 4,
							flexWrap: "wrap",
							"& .MuiToggleButton-root": {
								border: "2px solid #e0e0e0",
								borderRadius: 5,
								backgroundColor: "#white",
								transition: "all 0.4s ease",
								"&.Mui-selected": {
									borderColor: "primary.main",
									backgroundColor: "primary.main",
									color: "white",
									"&:hover": {
										backgroundColor: "primary.main",
									},
								},
								"&:hover": {
									backgroundColor: "primary.light",
								},
							},
						}}
					>
						{cats.map((cat) => (
							<ToggleButton
								key={cat}
								value={cat}
								sx={{
									padding: 3,
									gap: 2,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Box
									component="img"
									src={selected == cat ? cat.imgSelected : cat.img}
									sx={{ objectFit: "cover", width: "10em" }}
								/>
								<Typography>{cat.type}</Typography>
							</ToggleButton>
						))}
					</ToggleButtonGroup>

					{selected && catName && (
						<Box sx={{ display: "flex", justifyContent: "center", width: "100%", paddingBlock: 3}}>
							<AttentionSeeker effect="tada">
								<Button variant="contained" onClick={handleCreateCat}>Save</Button>
							</AttentionSeeker>
						</Box>
					)}
				</Stack>
			</Container>
		</Dialog>
	);
}
