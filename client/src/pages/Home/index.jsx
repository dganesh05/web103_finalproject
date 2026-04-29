import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Testing from "../Testing";
import TasksDrawer from "./TasksDrawer";
import VirtualRoom from "./VirtualRoom";
import { useContext, useEffect, useRef, useState } from "react";
import AuthContext from "../../contexts/AuthContext";
import CatSelect from "./CatSelect";
import { CircularProgress } from "@mui/material";

export default function Home() {
	const { user, isNewUser } = useContext(AuthContext);
	const [catDialogOpen, setCatDialogOpen] = useState(false);
	const [profile, setProfile] = useState(null);
	const defaultProfileCreatedForUser = useRef(null);

	useEffect(() => {
		console.log("Cat dialog open? ", catDialogOpen);
	}, [catDialogOpen]);

	useEffect(() => {

		if (!user?.uid) return;
		
		let isCurrent = true; // ✅ track if this effect is still valid

		const getCatInfo = async () => {
			try {
				const results = await fetch(`/api/cats/${user?.uid}`);
				const data = await results.json();

				console.log("Data: ", data);

				if (isCurrent && user) {
					setCatDialogOpen(data.length === 0);
				}
			} catch (err) {
				console.error(err.message);
			}
		};

		getCatInfo();

		return () => {
			isCurrent = false; // ❌ invalidate old requests
		};
	}, [user]);

	useEffect(() => {
		console.log("Profile:", profile);
	}, [profile]);

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "calc(100svh - 75px)",
				width: "100%",
			}}
		>
			{/* <Typography variant="h1">
                Home Page
            </Typography> */}
			{user && (
				<CatSelect
					open={catDialogOpen}
					handleClose={() => setCatDialogOpen(false)}
				/>
			)}

			{user ? (
				<VirtualRoom initialProfile={profile} />
			) : (
				<CircularProgress size={100} />
			)}
		</Box>
	);
}
