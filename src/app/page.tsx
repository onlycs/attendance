'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransitionOut } from '@lib/transitions';

import React, { useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { Label } from '@ui/label';

export default function Home() {
	const router = useRouter();
	const { push } = useTransitionOut(router);

	useEffect(() => {
		router.prefetch('/admin');
		router.prefetch('/student');
	}, [router]);

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-row'>
				<Button className="w-64 flex flex-row justify-center items-center" onClick={() => push('/admin')}>
					Admin Panel&emsp;&rarr;
				</Button>

				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger>
							<HelpCircle className='ml-4' size='20' color='darkgray' />
						</TooltipTrigger>
						<TooltipContent>
							<Label className="text-center text-md leading-5">
								Download student hours or start attendance
							</Label>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<Button className="w-64" onClick={() => push('/student')}>
				Students&ensp;&ndash;&ensp;View Your Hours&emsp;&rarr;
			</Button>
		</div >
	);
}
