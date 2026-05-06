
import random
import cplex
class HideAndSeekGame:
    def __init__(self, num_places):
        self.num_places = num_places
        self.payoff_matrix = self.initialize_solver(num_places)

    @staticmethod
    def initialize_solver(num_places):
        places_criteria = [random.randint(1, 3) for _ in range(num_places)]
        category_names = {
            1: "easy",
            2: "neutral",
            3: "hard"
        }
        places =[category_names[c] for c in places_criteria] ;
        print("Places criteria:", places_criteria)
        print(places)
        payoff_matrix = [[0]*num_places for _ in range(num_places)]
        for i, k in enumerate(places_criteria):
                if category_names[k]== "easy":
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-1 ;
                        else:
                            payoff_matrix[i][j] = 2 ;
                elif category_names[k]== "neutral":
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-1 ;
                        else:
                            payoff_matrix[i][j] = 1 ;
                else:  # hard
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-3 ;
                        else:
                            payoff_matrix[i][j] = 1 ;
        return payoff_matrix

    @staticmethod
    def print_payoff_matrix(matrix):
        for row in matrix:
            print(row)

    @staticmethod
    def play_game(place, turn, num_places, payoff_matrix):
        xc = random.randint(0, num_places - 1)
        # payoff_matrix[i][j] represents hider's payoff when hider chooses place i, seeker chooses place j
        

        # When hider is playing, use matrix directly
        hider_score = payoff_matrix[place][xc] if turn == "hider" else payoff_matrix[xc][place]   # hider's payoff
        #HideAndSeekGame.print_payoff_matrix(payoff_matrix)
        if(place == xc):
            seeker_score = -hider_score  # zero-sum game
            hider_score=0
        else:
            seeker_score=0
        
        if turn == "seeker":
            winner = "seeker" if xc == place else "hider"
        else:
            winner = "hider" if xc != place else "seeker"
        
        return {
            "opponent_place": xc,
            "winner": winner,
            "message": "You win!" if winner == turn else "You lose.",
            "hider_score": hider_score,
            "seeker_score": seeker_score,
            "your_score": seeker_score if turn == "seeker" else hider_score,
            "opponent_score": hider_score if turn == "seeker" else seeker_score
        }

    @staticmethod
    def simulate_game(num_places, payoff_matrix, num_rounds=100):
        player_score = 0
        computer_score = 0
        rounds_won_player = 0
        rounds_won_computer = 0
        for _ in range(num_rounds):
            role = random.choice(["hider", "seeker"])
            place = random.randint(0, num_places - 1)
            result = HideAndSeekGame.play_game(place, role, num_places, payoff_matrix)
            if result["winner"] == role:
                rounds_won_player += 1
                player_score += result["your_score"]
            else:
                rounds_won_computer += 1
                computer_score += result["opponent_score"]
        return {
            "total_rounds": num_rounds,
            "player_score": player_score,
            "computer_score": computer_score,
            "rounds_won_player": rounds_won_player,
            "rounds_won_computer": rounds_won_computer
        }


    @staticmethod
    def solve_payoff_matrix(payoff_matrix, role="hider"):
        myproblem = cplex.Cplex()
        myproblem.set_log_stream(None)
        myproblem.set_results_stream(None)

        m = len(payoff_matrix)
        n = len(payoff_matrix[0])

        if role == "hider":
            # ── HIDER (maximizer): your existing code, unchanged ──
            myproblem.objective.set_sense(myproblem.objective.sense.maximize)

            x_names = [f"x{i}" for i in range(m)]
            myproblem.variables.add(names=x_names, lb=[0.0] * m)
            v_name = ["v"]
            myproblem.variables.add(names=v_name, lb=[-cplex.infinity])

            myproblem.linear_constraints.add(
                lin_expr=[cplex.SparsePair(ind=x_names, val=[1.0] * m)],
                senses=["E"], rhs=[1.0]
            )
            for j in range(n):
                myproblem.linear_constraints.add(
                    lin_expr=[cplex.SparsePair(
                        ind=x_names + v_name,
                        val=[payoff_matrix[i][j] for i in range(m)] + [-1.0]
                    )],
                    senses=["G"], rhs=[0.0]
                )
            myproblem.objective.set_linear("v", 1.0)
            myproblem.solve()

            optimal_strategy = myproblem.solution.get_values(x_names)
            game_value = myproblem.solution.get_values("v")

        else:
            # ── SEEKER (minimizer / dual): iterate over rows instead of columns ──
            myproblem.objective.set_sense(myproblem.objective.sense.minimize)

            y_names = [f"y{j}" for j in range(n)]
            myproblem.variables.add(names=y_names, lb=[0.0] * n)
            w_name = ["w"]
            myproblem.variables.add(names=w_name, lb=[-cplex.infinity])

            myproblem.linear_constraints.add(
                lin_expr=[cplex.SparsePair(ind=y_names, val=[1.0] * n)],
                senses=["E"], rhs=[1.0]
            )
            for i in range(m):                          # rows now, not columns
                myproblem.linear_constraints.add(
                    lin_expr=[cplex.SparsePair(
                        ind=y_names + w_name,
                        val=[payoff_matrix[i][j] for j in range(n)] + [-1.0]
                    )],
                    senses=["L"], rhs=[0.0]             # ≤ instead of ≥
                )
            myproblem.objective.set_linear("w", 1.0)
            myproblem.solve()

            optimal_strategy = myproblem.solution.get_values(y_names)
            game_value = myproblem.solution.get_values("w")

        print("Role:", role, "| Optimal strategy:", optimal_strategy, "| Game value:", game_value)
        return optimal_strategy, game_value


        

