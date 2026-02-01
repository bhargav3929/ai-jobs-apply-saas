from typing import List, Dict
from math import ceil
import random


TARGET_MAX = 20      # Max jobs per user per day
TARGET_MIN = 15      # Minimum we aim for before enabling sharing
MAX_SHARING = 3      # Max users that can apply to the same job


class DistributionEngine:
    """
    Smart job distribution with demand-supply analysis.
    Enables job sharing when supply is low to ensure each user
    gets close to TARGET_MIN applications.
    """

    def distribute(self, users: List[Dict], jobs: List[Dict]) -> Dict[str, List[Dict]]:
        if not users or not jobs:
            return {user["uid"]: [] for user in users} if users else {}

        random.shuffle(jobs)

        total_users = len(users)
        total_jobs = len(jobs)
        ratio = total_jobs / total_users

        # Stage 1: Determine mode and targets
        if ratio >= TARGET_MAX:
            # Plenty of jobs — exclusive assignment, everyone gets 20
            sharing_factor = 1
            target_per_user = TARGET_MAX
        elif ratio >= TARGET_MIN:
            # Enough jobs — exclusive, each gets floor(ratio)
            sharing_factor = 1
            target_per_user = int(ratio)
        else:
            # Supply shortage — enable sharing
            sharing_factor = min(ceil(TARGET_MIN / ratio), MAX_SHARING)
            target_per_user = min(TARGET_MIN, int(ratio * sharing_factor))

        # Stage 2: Build slot pool
        # Each job can be assigned to `sharing_factor` users
        # Track remaining slots per job
        job_slots = {}  # jobId -> remaining slots
        for job in jobs:
            job_slots[job["jobId"]] = sharing_factor

        # Track share groups: jobId -> group number and list of assigned users
        share_group_counter = 0
        job_share_groups = {}  # jobId -> (group_number, [user_ids])

        # Initialize assignments
        assignments = {user["uid"]: [] for user in users}
        user_counts = {user["uid"]: 0 for user in users}

        # Stage 3: Fair round-robin assignment
        # Repeat rounds until no more assignments possible or all users at target
        changed = True
        while changed:
            changed = False
            # Sort users by fewest assignments (fairness)
            sorted_users = sorted(users, key=lambda u: user_counts[u["uid"]])

            for user in sorted_users:
                user_id = user["uid"]
                if user_counts[user_id] >= target_per_user:
                    continue

                # Find best available job
                for job in jobs:
                    job_id = job["jobId"]

                    # No slots left
                    if job_slots.get(job_id, 0) <= 0:
                        continue

                    # User already applied (from DB or this batch)
                    if user_id in job.get("appliedByUsers", []):
                        continue

                    # Assign
                    if job_id not in job_share_groups:
                        share_group_counter += 1
                        job_share_groups[job_id] = (share_group_counter, [])

                    group_num, group_users = job_share_groups[job_id]
                    position_in_group = len(group_users)
                    group_users.append(user_id)

                    # Add job to user's assignments with sharing metadata
                    job_copy = dict(job)
                    job_copy["_share_group"] = group_num
                    job_copy["_share_position"] = position_in_group
                    assignments[user_id].append(job_copy)

                    # Update tracking
                    job_slots[job_id] -= 1
                    user_counts[user_id] += 1

                    # Mark in-memory to prevent re-assignment
                    if "appliedByUsers" not in job:
                        job["appliedByUsers"] = []
                    job["appliedByUsers"].append(user_id)

                    changed = True
                    break

        return assignments
